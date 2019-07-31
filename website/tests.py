from django.test import TestCase
from .views import generate_blog_page_numbers
import unittest
# Create your tests here.

class TestGenerateBlogPageNumbers(unittest.TestCase):
    test_data = (
            # test page_number_limit, posts
            {'expected':(1,), 'page':1, 'page_number_limit':1, 'posts':0, 'posts_per_page':1},
            {'expected':(1,), 'page':1, 'page_number_limit':1, 'posts':1, 'posts_per_page':1},
            {'expected':(1,), 'page':1, 'page_number_limit':1, 'posts':2, 'posts_per_page':1},
            {'expected':(1,2,), 'page':1, 'page_number_limit':2, 'posts':2, 'posts_per_page':1},

            # test odd page number limit
            # test page number clipping
            {'expected':(1,2,3,4,5,), 'page':-1, 'page_number_limit':5, 'posts':10, 'posts_per_page':1},
            {'expected':(1,2,3,4,5,), 'page':0, 'page_number_limit':5, 'posts':10, 'posts_per_page':1},
            {'expected':(1,2,3,4,5,), 'page':1, 'page_number_limit':5, 'posts':10, 'posts_per_page':1},
            {'expected':(1,2,3,4,5,), 'page':3, 'page_number_limit':5, 'posts':10, 'posts_per_page':1},
            
            # test normal operation
            {'expected':(2,3,4,5,6,), 'page':4, 'page_number_limit':5, 'posts':10, 'posts_per_page':1},
            {'expected':(5,6,7,8,9,), 'page':7, 'page_number_limit':5, 'posts':10, 'posts_per_page':1},
            
            # test page number clipping
            {'expected':(6,7,8,9,10), 'page':8, 'page_number_limit':5, 'posts':10, 'posts_per_page':1},
            {'expected':(6,7,8,9,10), 'page':9, 'page_number_limit':5, 'posts':10, 'posts_per_page':1},
            {'expected':(6,7,8,9,10), 'page':10, 'page_number_limit':5, 'posts':10, 'posts_per_page':1},
            {'expected':(6,7,8,9,10), 'page':11, 'page_number_limit':5, 'posts':10, 'posts_per_page':1},
            
            # test even page number limit
            # test page number clipping
            {'expected':(1,2,3,4,5,6,), 'page':-1, 'page_number_limit':6, 'posts':10, 'posts_per_page':1},
            {'expected':(1,2,3,4,5,6,), 'page':0, 'page_number_limit':6, 'posts':10, 'posts_per_page':1},
            {'expected':(1,2,3,4,5,6,), 'page':1, 'page_number_limit':6, 'posts':10, 'posts_per_page':1},
            {'expected':(1,2,3,4,5,6,), 'page':3, 'page_number_limit':6, 'posts':10, 'posts_per_page':1},
            
            # test normal operation
            {'expected':(2,3,4,5,6,7,), 'page':4, 'page_number_limit':6, 'posts':10, 'posts_per_page':1},
            {'expected':(4,5,6,7,8,9,), 'page':6, 'page_number_limit':6, 'posts':10, 'posts_per_page':1},

            # test page number clipping
            {'expected':(5,6,7,8,9,10,), 'page':7, 'page_number_limit':6, 'posts':10, 'posts_per_page':1},
            {'expected':(5,6,7,8,9,10,), 'page':8, 'page_number_limit':6, 'posts':10, 'posts_per_page':1},
            {'expected':(5,6,7,8,9,10,), 'page':10, 'page_number_limit':6, 'posts':10, 'posts_per_page':1},
            {'expected':(5,6,7,8,9,10,), 'page':11, 'page_number_limit':6, 'posts':10, 'posts_per_page':1},
            )
    def test_generate_blog_page_numbers(self):
        for test in self.test_data:
            name = "pg_"+str(test['page'])
            name += "_pg_lim_"+str(test['page_number_limit'])
            name += "_post_count_"+str(test['posts'])
            name += "_posts_per_page_"+str(test['posts_per_page'])
            with self.subTest(msg=name):
                result = generate_blog_page_numbers(test['page'], test['posts'],
                        test['page_number_limit'], test['posts_per_page'])
                self.assertEqual(tuple(result), test['expected'])

