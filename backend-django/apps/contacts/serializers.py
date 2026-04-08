from rest_framework import serializers
from .models import ContactGroup, Contact


class ContactGroupSerializer(serializers.ModelSerializer):
    total_contacts = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = ContactGroup
        fields = ['id', 'nombre', 'color', 'created_at', 'total_contacts']
        read_only_fields = ['id', 'created_at']


class ContactSerializer(serializers.ModelSerializer):
    grupo_nombre = serializers.CharField(source='grupo.nombre', read_only=True, default=None)
    grupo_color = serializers.CharField(source='grupo.color', read_only=True, default=None)

    class Meta:
        model = Contact
        fields = [
            'id', 'nombre', 'telefono', 'grupo_id', 'notas',
            'activo', 'created_at', 'grupo_nombre', 'grupo_color',
        ]
        read_only_fields = ['id', 'created_at']


class ContactMinimalSerializer(serializers.ModelSerializer):
    """Minimal serializer for the /contacts/all endpoint."""

    class Meta:
        model = Contact
        fields = ['id', 'nombre', 'telefono', 'grupo_id']
