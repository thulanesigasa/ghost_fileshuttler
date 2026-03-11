import os
import re

def update_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as file:
        content = file.read()
    
    # Update head section
    head_pattern = r'(<head>.*?<title>).*?(</title>.*?</head>)'
    head_replacement = r'\1ptechsolutions\2'
    content = re.sub(head_pattern, head_replacement, content, flags=re.DOTALL)
    
    # Update preloader
    preloader_pattern = r'(<div class="mil-preloader">\s*<div class="mil-preloader-animation">\s*<div class="mil-pos-abs mil-animation-1">\s*<p class="mil-h3 mil-muted mil-thin">).*?(</p>\s*<p class="mil-h3 mil-muted">).*?(</p>\s*<p class="mil-h3 mil-muted mil-thin">).*?(</p>\s*</div>\s*<div class="mil-pos-abs mil-animation-2">\s*<div class="mil-reveal-frame">\s*<p class="mil-reveal-box"></p>\s*<p class="mil-h3 mil-muted mil-thin">).*?(</p>)'
    preloader_replacement = r'\1T.s Industries\2presents\3ptechsolutions\4ptechsolutions.co.za\5'
    content = re.sub(preloader_pattern, preloader_replacement, content, flags=re.DOTALL)
    
    # Update project names in menu
    project_pattern = r'(<ul class="mil-menu-list">\s*<li><a href="project-1\.html" class="mil-light-soft">).*?(</a>.*?<li><a href="project-2\.html" class="mil-light-soft">).*?(</a>.*?<li><a href="project-3\.html" class="mil-light-soft">).*?(</a>.*?<li><a href="project-4\.html" class="mil-light-soft">).*?(</a>.*?<li><a href="project-5\.html" class="mil-light-soft">).*?(</a>.*?<li><a href="project-6\.html" class="mil-light-soft">).*?(</a>)'
    project_replacement = r'\1GENI - Gender Equality Chatbot\2pLifeMap - AI Companion Life Coach\3Kasi Gibela\4CarZone - German Car Showcase\5Men\'s Mental Health Month – Awareness Campaign\6VarsityVault\7'
    content = re.sub(project_pattern, project_replacement, content, flags=re.DOTALL)
    
    # Write changes back to file
    with open(file_path, 'w', encoding='utf-8') as file:
        file.write(content)

def main():
    template_dir = 'c:\\Users\\T.s\\Downloads\\ashley-creative-portfolio-template-2024-01-08-13-05-20-utc\\Ashley html template\\ashley'
    
    for filename in os.listdir(template_dir):
        if filename.endswith('.html'):
            file_path = os.path.join(template_dir, filename)
            print(f'Updating {filename}...')
            try:
                update_file(file_path)
                print(f'Successfully updated {filename}')
            except Exception as e:
                print(f'Error updating {filename}: {str(e)}')

if __name__ == '__main__':
    main()
