#!/bin/sh

# target
tar xzf firewalld-config.tgz -C /etc
restorecon -R /etc/firewalld        # EL9, keep SELinux happy
firewall-cmd --reload
