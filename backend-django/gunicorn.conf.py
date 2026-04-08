bind = "127.0.0.1:3006"
workers = 2
worker_class = "sync"
timeout = 120
accesslog = "/home/ec2-user/wsp-manager-prod/backend-django/logs/gunicorn-access.log"
errorlog = "/home/ec2-user/wsp-manager-prod/backend-django/logs/gunicorn-error.log"
loglevel = "info"
