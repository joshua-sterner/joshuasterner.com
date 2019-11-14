from django.shortcuts import render
from django.http import HttpResponse
from .models import BlogPost
from .models import Tag
from django.urls import reverse

def home(request):
    return render(request, 'home.html', {})

def generate_blog_page_numbers(page, posts, page_number_limit=10, posts_per_page=5):
    page_count = max(0, posts - 1)//posts_per_page + 1
    left_page_number = max(min(page - (page_number_limit-1)//2, page_count - page_number_limit + 1),1)
    right_page_number = min(left_page_number+page_number_limit-1, page_count)
    page_numbers = range(left_page_number, right_page_number + 1)
    return page_numbers

def blog_posts_by_QuerySet(request, page, query_set, query_root):
    posts_per_page = 2
    first_post_index = (page-1)*posts_per_page
    posts = query_set[first_post_index:first_post_index+posts_per_page]
    tags = Tag.objects.all()
    post_count = len(query_set)
    page_count = max(0, post_count - 1)//posts_per_page + 1
    page_numbers = generate_blog_page_numbers(page, post_count, 10, posts_per_page)
    context = {'posts': posts, 'tags': tags, 'page': page, 'page_count': page_count, 'page_numbers': page_numbers, 'query_root': query_root}
    return render(request, 'blog.html', context)

def blog(request, page=1):
    query_set = BlogPost.objects.order_by('-date_posted')
    return blog_posts_by_QuerySet(request, page, query_set, reverse('blog'))

def blog_posts_by_tag(request, tag, page=1):
    query_set = Tag.objects.get(name=tag).blogpost_set.order_by('-date_posted')
    query_root = reverse('blog_by_tag', args=[tag])
    return blog_posts_by_QuerySet(request, page, query_set, query_root)

def music(request):
    return render(request, 'music.html', {})
