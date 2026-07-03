#!/bin/sh

swaks --to nate.lally@gmail.com \
      --from anna@happytailspawcare.com \
      --server mail.happytailspawcare.com:465 \
      --auth PLAIN \
      --auth-user vmail \
      --tls \
      --header "Subject: Coming from swaks alongside nodemailer" \
      --body "Mock data from multiple machines for diagnostics.  Let me know if you get this, thanks- Anna"
