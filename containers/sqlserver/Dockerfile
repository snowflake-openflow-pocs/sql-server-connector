FROM mcr.microsoft.com/mssql/server:2022-latest

ENV ACCEPT_EULA=Y

# Copy init script
COPY init.sql /init.sql

# Create custom entrypoint
RUN echo '#!/bin/bash' > /entrypoint.sh && \
    echo '/opt/mssql/bin/sqlservr &' >> /entrypoint.sh && \
    echo 'sleep 30' >> /entrypoint.sh && \
    echo '/opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P "$SA_PASSWORD" -i /init.sql' >> /entrypoint.sh && \
    echo 'wait' >> /entrypoint.sh && \
    chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]