from django.db import models

class Tag(models.Model):
    name = models.CharField(max_length=500)
    def __str__(self):
        return self.name
    
class BlogPost(models.Model):
    title = models.CharField(max_length=1000)
    post_content = models.TextField()
    tags = models.ManyToManyField(Tag)
    date_posted = models.DateTimeField(auto_now_add=True)
    date_modified = models.DateTimeField(auto_now=True)
    def __str__(self):
        return self.title
