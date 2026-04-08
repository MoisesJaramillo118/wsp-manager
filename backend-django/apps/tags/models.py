from django.db import models


class Tag(models.Model):
    nombre = models.CharField(max_length=100, unique=True)
    color = models.CharField(max_length=20, default='#ec4899')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'tags'
        ordering = ['nombre']

    def __str__(self):
        return self.nombre


class ConversationTag(models.Model):
    conversation_phone = models.CharField(max_length=20)
    tag = models.ForeignKey(Tag, on_delete=models.CASCADE)

    class Meta:
        db_table = 'conversation_tags'
        unique_together = [('conversation_phone', 'tag')]

    def __str__(self):
        return f'{self.conversation_phone} - {self.tag}'


class ContactTag(models.Model):
    contact_id = models.IntegerField()
    tag = models.ForeignKey(Tag, on_delete=models.CASCADE)

    class Meta:
        db_table = 'contact_tags'
        unique_together = [('contact_id', 'tag')]

    def __str__(self):
        return f'Contact {self.contact_id} - {self.tag}'
