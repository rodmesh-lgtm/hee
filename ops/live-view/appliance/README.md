# INFRO appliance preparation (operator pilot)

Same connector and branch-scoped enrollment as Windows, with a dedicated systemd
identity. Prepare a supported Linux x64/ARM64 machine with Node 20+, FFmpeg,
FFprobe, CA certificates and Ethernet. No hardware has been bought or certified.
No pre-paired golden images: each physical device gets its own one-use branch code.

From a reviewed repository checkout, root operator runs `install.sh`. It copies
admin-owned executable code, provisions a protected state directory and installs
the service WITHOUT starting or enrolling it. Follow its interactive pairing
command, then enable the service. Never put pairing codes in arguments/logs.

Client configuration and temporary links remain in INFRO. Pairing currently needs
installer assistance; zero-touch appliance activation is not implemented. This
recipe does not constitute a ready-to-sell hardware product. Test cold boot,
network loss, TLS, actual playback, concurrent cameras, revocation, heat/power,
updates and secure device reset on the selected hardware before distribution.

Keep ingress closed; neither camera RTSP nor a local admin web server is exposed.
On replacement/disposal revoke the connector in INFRO and securely wipe its local
state. Operator-managed updates must stop the service, install reviewed connector
bytes as root, restart and verify actual video. This is not an automatic updater.
