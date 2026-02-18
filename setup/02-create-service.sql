CREATE SERVICE IF NOT EXISTS POC_CDC.PUBLIC.CDC_DEMO_SERVICE
  IN COMPUTE POOL CDC_DEMO_POOL
  FROM SPECIFICATION $$
{
  "spec": {
    "containers": [
      {
        "name": "sqlserver",
        "image": "/POC_CDC/PUBLIC/IMAGES/sqlserver:latest",
        "env": {
          "ACCEPT_EULA": "Y",
          "SA_PASSWORD": {
            "secretRef": "SQL_SA_PASSWORD"
          }
        },
        "volumeMounts": [
          {
            "name": "sqlserver-data",
            "mountPath": "/var/opt/mssql"
          }
        ],
        "resources": {
          "requests": {
            "cpu": "1",
            "memory": "2Gi"
          },
          "limits": {
            "cpu": "2",
            "memory": "4Gi"
          }
        }
      },
      {
        "name": "streamlit",
        "image": "/POC_CDC/PUBLIC/IMAGES/streamlit:latest",
        "env": {
          "SQL_HOST": "localhost",
          "SQL_PORT": "1433",
          "SQL_USER": "sa",
          "SQL_PASSWORD": {
            "secretRef": "SQL_SA_PASSWORD"
          },
          "SQL_DATABASE": "DemoDB"
        },
        "resources": {
          "requests": {
            "cpu": "0.5",
            "memory": "512Mi"
          },
          "limits": {
            "cpu": "1",
            "memory": "1Gi"
          }
        }
      }
    ],
    "volumes": [
      {
        "name": "sqlserver-data",
        "source": "block",
        "size": "10Gi"
      }
    ],
    "endpoints": [
      {
        "name": "streamlit",
        "port": 8501,
        "public": true
      }
    ]
  }
}
$$;