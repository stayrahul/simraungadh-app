import re

with open('src/app/(tabs)/index.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    "<Text className={`text-[15px] font-black tracking-tight ${theme.textClass}`}>{profile?.full_name}</Text>",
    "<Text className={`text-[15px] font-black tracking-tight ${theme.textClass}`}>{profile?.full_name}</Text>\n                {profile?.is_verified && <CheckCircle size={14} color=\"#3b82f6\" className=\"ml-1\" />}"
)

# And for feed cards
content = content.replace(
    "<Text className={`text-[14px] font-bold ${theme.textClass}`}>{item.author?.full_name || 'Anonymous'}</Text>",
    "<Text className={`text-[14px] font-bold ${theme.textClass}`}>{item.author?.full_name || 'Anonymous'}</Text>\n                  {item.author?.is_verified && <CheckCircle size={14} color=\"#3b82f6\" className=\"ml-1\" />}"
)

with open('src/app/(tabs)/index.tsx', 'w') as f:
    f.write(content)
