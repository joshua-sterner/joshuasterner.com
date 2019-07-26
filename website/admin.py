from django.contrib import admin

from .models import Tag
from .models import BlogPost

admin.site.register(BlogPost)
admin.site.register(Tag)
