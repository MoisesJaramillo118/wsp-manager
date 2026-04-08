from django.db import models


class Reminder(models.Model):
    remote_phone = models.CharField(max_length=20)
    advisor_id = models.IntegerField(null=True, blank=True)
    note = models.TextField()
    remind_at = models.DateTimeField()
    status = models.CharField(
        max_length=20,
        choices=[('pending', 'Pending'), ('done', 'Done'), ('dismissed', 'Dismissed')],
        default='pending',
        db_index=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'reminders'
