#!/bin/sh

# target
tar xzf fail2ban.tgz -C /etc
restorecon -R /etc/fail2ban        # EL9, keep SELinux happy

