from rest_framework import serializers
from .models import Advisor


class AdvisorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Advisor
        exclude = ['password_hash']


class AdvisorCreateSerializer(serializers.Serializer):
    nombre = serializers.CharField(max_length=200)
    email = serializers.EmailField()
    password = serializers.CharField(required=False, allow_blank=True, default='')
    rol = serializers.ChoiceField(choices=['admin', 'asesor'], default='asesor')
    color = serializers.CharField(max_length=20, default='#ec4899')
    especialidad = serializers.CharField(max_length=200, required=False, default='')
    local_tienda = serializers.CharField(max_length=200, required=False, default='')
    max_chats = serializers.IntegerField(default=10)


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()
