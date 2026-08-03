import os
import re

files_to_fix = [
    'src/app/login.tsx',
    'src/app/publish-notice.tsx',
    'src/app/report.tsx',
    'src/app/settings.tsx',
    'src/components/FeedCard.tsx',
]

def replace_message(match):
    var_name = match.group(1)
    # Replaces `e.message` with `(e instanceof Error ? e.message : String(e))`
    return f"({var_name} instanceof Error ? {var_name}.message : String({var_name}))"

for file_path in files_to_fix:
    with open(file_path, 'r') as f:
        content = f.read()

    # Find `e.message` or `error.message`
    # We only want to replace it inside catch blocks ideally, but doing a global replace of e.message 
    # where e/error is the exception is fine because we know the context from the compiler errors.
    
    content = re.sub(r'\b([e]|error)\.message\b', replace_message, content)

    with open(file_path, 'w') as f:
        f.write(content)
    print(f"Fixed {file_path}")

