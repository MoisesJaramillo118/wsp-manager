import os
from io import StringIO

from cryptography.fernet import Fernet, InvalidToken
from dotenv import dotenv_values


ENCRYPTED_PREFIX = 'enc:'


def get_master_key():
    return (
        os.getenv('ENV_MASTER_KEY')
        or os.getenv('APP_SECRETS_KEY')
        or ''
    ).strip()


def has_master_key():
    return bool(get_master_key())


def is_encrypted_value(value):
    return isinstance(value, str) and value.startswith(ENCRYPTED_PREFIX)


def _get_fernet():
    key = get_master_key()
    if not key:
        return None
    return Fernet(key.encode())


def encrypt_value(value):
    if not value:
        return ''
    if is_encrypted_value(value):
        return value

    fernet = _get_fernet()
    if not fernet:
        return value

    token = fernet.encrypt(str(value).encode()).decode()
    return ENCRYPTED_PREFIX + token


def decrypt_value(value):
    if not value:
        return ''
    if not is_encrypted_value(value):
        return value

    fernet = _get_fernet()
    if not fernet:
        return value

    token = value[len(ENCRYPTED_PREFIX):]
    try:
        return fernet.decrypt(token.encode()).decode()
    except InvalidToken:
        return value


def load_encrypted_env(path):
    if not os.path.exists(path):
        return {}

    fernet = _get_fernet()
    if not fernet:
        return {}

    with open(path, 'rb') as fh:
        encrypted = fh.read().strip()

    if not encrypted:
        return {}

    decrypted = fernet.decrypt(encrypted).decode()
    values = dotenv_values(stream=StringIO(decrypted))
    for key, value in values.items():
        if value is not None:
            os.environ[key] = value
    return values
