from django import template
import markdown

register = template.Library()

@register.filter
def parse_markdown(value):
    return markdown.markdown(value)
