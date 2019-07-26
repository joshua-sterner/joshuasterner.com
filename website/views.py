from django.shortcuts import render
from django.http import HttpResponse
from .models import BlogPost
from .models import Tag

def home(request):
    return render(request, 'home.html', {})

def blog(request, page=1):
    posts_per_page = 2
    first_post_index = (page-1)*posts_per_page
    posts = BlogPost.objects.order_by('date_posted')[first_post_index:first_post_index+posts_per_page]
    tags = Tag.objects.all()
    page_count = BlogPost.objects.count()//posts_per_page + 1
    page_numbers = range(1, page_count+1)
    context = {'posts': posts, 'tags': tags, 'page': page, 'page_count': page_count, 'page_numbers': page_numbers}
    return render(request, 'blog.html', context)
