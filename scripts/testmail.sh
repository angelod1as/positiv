#!/bin/bash
# Don't forget to chmod +x this file :)

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Check if MailHog is installed
if command_exists mailhog; then
  echo "MailHog is installed."
else
  echo "MailHog is not installed."

  # Ask if the user wants to install MailHog
  read -p "Do you want to install MailHog using Homebrew? (y/n) " choice
  if [ "$choice" = "y" ] || [ "$choice" = "Y" ]; then

    # Check if Homebrew is installed
    if command_exists brew; then
      echo "Installing MailHog..."
      brew install mailhog

      if [ $? -eq 0 ]; then
        echo "MailHog installed successfully."
      else
        echo "Failed to install MailHog. Please check your Homebrew setup."
        exit 1
      fi
    else
      echo "Homebrew is not installed. Please install Homebrew and try again."
      exit 1
    fi
  else
    echo "Installation canceled."
    exit 0
  fi
fi

# Run MailHog
echo "Running MailHog..."
mailhog
