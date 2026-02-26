FROM mcr.microsoft.com/mssql/server:2022-latest

ENV ACCEPT_EULA=Y

# Copy startup script and init script
COPY startup.sh /startup.sh
COPY init.sql /opt/init.sql

ENTRYPOINT ["/bin/bash", "/startup.sh"]