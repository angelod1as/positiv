import { Fragment } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog"
import { likertCopy } from "~/copy/forms"

const copy = likertCopy.keyboard

const kbdClassName =
  "rounded border border-muted-foreground/40 px-1.5 font-mono text-xs"

export function LikertKeyboardHelp() {
  return (
    <Dialog>
      <DialogTrigger className="hidden cursor-pointer text-red pointer-fine:inline underline underline-offset-3 transition-colors duration-150 hover:text-purple">
        {copy.open}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        {copy.groups.map((group) => (
          <section key={group.title} className="flex flex-col gap-2">
            <h3 className="text-base font-semibold">{group.title}</h3>
            <dl className="grid grid-cols-[11rem_1fr] gap-x-4 gap-y-2 text-sm">
              {group.shortcuts.map((shortcut) => (
                <Fragment key={shortcut.action + shortcut.keys.join()}>
                  <dt className="flex flex-wrap items-center gap-1">
                    {shortcut.keys.map((key, index) => (
                      <Fragment key={key}>
                        {index > 0 && shortcut.keys.length === 2 ? (
                          <span className="text-muted-foreground">
                            {copy.or}
                          </span>
                        ) : null}
                        <kbd className={kbdClassName}>{key}</kbd>
                      </Fragment>
                    ))}
                  </dt>
                  <dd>{shortcut.action}</dd>
                </Fragment>
              ))}
            </dl>
          </section>
        ))}
      </DialogContent>
    </Dialog>
  )
}
