import { type Page, type Locator, expect } from '@playwright/test'

export abstract class BasePage {
  protected page: Page

  constructor(page: Page) {
    this.page = page
  }

  /**
   * Wait for the page to be fully loaded, including:
   * - DOM content loaded
   * - Network idle
   * - No pending animations (with timeout)
   */
  async waitForPageLoad(): Promise<void> {
    // Wait for DOM content to be loaded
    await this.page.waitForLoadState('domcontentloaded')
    
    // Wait for network to be idle with a reasonable timeout
    try {
      await this.page.waitForLoadState('networkidle', { timeout: 5000 })
    } catch {
      console.warn('Network did not go idle within 5 seconds, attempting fallback readiness check...')
      try {
        // Fallback: ensure the main document is still attached and not loading
        await this.page.waitForLoadState('domcontentloaded', { timeout: 2000 })
        // Wait for the document to be visible to reduce flakiness
        await this.page.waitForFunction(() => document.visibilityState === 'visible', null, { timeout: 2000 })
      } catch {
        console.warn('Fallback readiness check failed, continuing anyway.')
      }
    }
    
    // Wait for any animations to complete with a timeout
    try {
      await this.page.evaluate(() => {
        return new Promise<void>((resolve) => {
          // Set a maximum wait time for animations (increased for real UI transitions)
          const maxWait = setTimeout(() => resolve(), 3000)
          
          // Wait for any pending animations
          if (document.getAnimations) {
            const animations = document.getAnimations()
            
            // Filter for actively running, finite animations
            const activeAnimations = animations.filter(anim => {
              // Ignore finished or paused animations
              if (anim.playState !== 'running') return false
              
              const effect = anim.effect
              if (effect && 'getTiming' in effect) {
                const timing = (effect as KeyframeEffect).getTiming()
                return timing.iterations !== Infinity
              }
              return true
            })
            
            if (activeAnimations.length === 0) {
              clearTimeout(maxWait)
              resolve()
              return
            }
            
            // Use allSettled to handle both resolved and rejected animations
            Promise.allSettled(activeAnimations.map(animation => animation.finished))
              .finally(() => {
                clearTimeout(maxWait)
                resolve()
              })
          } else {
            // Fallback for browsers that don't support getAnimations
            clearTimeout(maxWait)
            setTimeout(resolve, 300)
          }
        })
      })
    } catch {
      // If animation wait fails, continue
      console.warn('Animation wait failed, continuing...')
    }
  }

  /**
   * Click an element and wait for the page to stabilize
   */
  async clickAndWait(locator: Locator, options?: { 
    timeout?: number
    waitForNavigation?: boolean 
    waitForResponse?: string | RegExp
  }): Promise<void> {
    const { timeout = 30000, waitForNavigation = false, waitForResponse } = options || {}

    // Ensure element is ready for interaction
    await locator.waitFor({ state: 'visible', timeout })
    await locator.waitFor({ state: 'attached', timeout })
    await expect(locator).toBeEnabled({ timeout })
    
    // Wait for no animations on the element
    await locator.evaluate((element) => {
      return new Promise<void>((resolve) => {
        if ('getAnimations' in element && typeof element.getAnimations === 'function') {
          const animations = element.getAnimations()
          if (animations.length === 0) {
            resolve()
            return
          }
          Promise.all(animations.map((a) => a.finished)).then(() => resolve())
        } else {
          resolve()
        }
      })
    })

    // Prepare promises for waiting
    const waitPromises: Promise<unknown>[] = []
    
    if (waitForNavigation) {
      waitPromises.push(this.page.waitForNavigation({ waitUntil: 'networkidle' }))
    }
    
    if (waitForResponse) {
      waitPromises.push(this.page.waitForResponse(waitForResponse))
    }

    // Click with retry mechanism
    let retries = 3
    while (retries > 0) {
      try {
        if (waitPromises.length > 0) {
          await Promise.all([
            locator.click({ timeout: 5000 }),
            ...waitPromises
          ])
        } else {
          await locator.click({ timeout: 5000 })
        }
        break
      } catch (error) {
        retries--
        if (retries === 0) throw error
        
        // Wait a bit before retrying
        await this.page.waitForTimeout(500)
        
        // Re-check element state
        await locator.waitFor({ state: 'visible', timeout: 5000 })
        await expect(locator).toBeEnabled({ timeout: 5000 })
      }
    }

    // Wait for any subsequent loading
    await this.waitForNetworkIdle()
  }

  /**
   * Fill a form field and verify the value was set correctly
   */
  async fillAndVerify(locator: Locator, value: string, options?: {
    timeout?: number
    clearFirst?: boolean
  }): Promise<void> {
    const { timeout = 30000, clearFirst = true } = options || {}

    // Ensure element is ready
    await locator.waitFor({ state: 'visible', timeout })
    await locator.waitFor({ state: 'attached', timeout })
    await expect(locator).toBeEnabled({ timeout })

    // Focus the element
    await locator.focus()
    
    // Clear existing value if requested
    if (clearFirst) {
      await locator.clear()
    }

    // Fill with retry mechanism
    let retries = 3
    while (retries > 0) {
      try {
        await locator.fill(value)
        
        // Verify the value was set
        const actualValue = await locator.inputValue()
        if (actualValue === value) {
          break
        }
        
        throw new Error(`Expected value "${value}" but got "${actualValue}"`)
      } catch (error) {
        retries--
        if (retries === 0) throw error
        
        // Wait before retry
        await this.page.waitForTimeout(300)
      }
    }

    // Blur to trigger any validation
    await locator.blur()
    
    // Small wait for any async validation
    await this.page.waitForTimeout(100)
  }

  /**
   * Wait for network to be idle
   */
  async waitForNetworkIdle(options?: { timeout?: number }): Promise<void> {
    const { timeout = 30000 } = options || {}
    
    try {
      await this.page.waitForLoadState('networkidle', { timeout })
    } catch {
      // If timeout, check if there are any pending requests
      const pendingRequests = await this.page.evaluate(() => {
        return window.performance.getEntriesByType('resource')
          .filter((entry) => {
            const resourceEntry = entry as PerformanceResourceTiming
            return !resourceEntry.responseEnd
          })
          .length
      })
      
      if (pendingRequests > 0) {
        console.warn(`Network idle timeout with ${pendingRequests} pending requests`)
      }
    }
  }

  /**
   * Navigate to a URL with proper waiting
   */
  async navigateTo(url: string): Promise<void> {
    await this.page.goto(url, { waitUntil: 'networkidle' })
    await this.waitForPageLoad()
  }

  /**
   * Check if an element exists on the page
   */
  async elementExists(locator: Locator, options?: { timeout?: number }): Promise<boolean> {
    const { timeout = 5000 } = options || {}
    
    try {
      await locator.waitFor({ state: 'attached', timeout })
      return true
    } catch {
      return false
    }
  }

  /**
   * Wait for an element to disappear
   */
  async waitForElementToDisappear(locator: Locator, options?: { timeout?: number }): Promise<void> {
    const { timeout = 30000 } = options || {}
    await locator.waitFor({ state: 'detached', timeout })
  }

  /**
   * Get text content with retry
   */
  async getTextContent(locator: Locator, options?: { timeout?: number }): Promise<string> {
    const { timeout = 30000 } = options || {}
    
    await locator.waitFor({ state: 'visible', timeout })
    
    let retries = 3
    while (retries > 0) {
      try {
        const text = await locator.textContent()
        if (text !== null && text.trim() !== '') {
          return text.trim()
        }
        throw new Error('Text content is empty')
      } catch (error) {
        retries--
        if (retries === 0) throw error
        await this.page.waitForTimeout(300)
      }
    }
    
    return ''
  }
}