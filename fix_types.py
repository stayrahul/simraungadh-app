import re

with open('src/lib/types.ts', 'r') as f:
    content = f.read()

content = content.replace(
    "civic_points: number;",
    "civic_points: number;\n  is_verified?: boolean;"
)

with open('src/lib/types.ts', 'w') as f:
    f.write(content)
