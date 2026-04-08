from rest_framework.views import exception_handler
from rest_framework.response import Response


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is not None:
        error_msg = ''
        if isinstance(response.data, dict):
            if 'detail' in response.data:
                error_msg = str(response.data['detail'])
            else:
                errors = []
                for field, msgs in response.data.items():
                    if isinstance(msgs, list):
                        errors.append(f"{field}: {', '.join(str(m) for m in msgs)}")
                    else:
                        errors.append(f"{field}: {msgs}")
                error_msg = '; '.join(errors)
        elif isinstance(response.data, list):
            error_msg = '; '.join(str(e) for e in response.data)
        else:
            error_msg = str(response.data)
        response.data = {'error': error_msg}
    return response
