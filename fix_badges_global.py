import re

files_to_update = ['src/app/settings.tsx', 'src/app/profile.tsx', 'src/app/user/[id].tsx']

for file in files_to_update:
    with open(file, 'r') as f:
        content = f.read()
    
    # Simple replacement to add a blue checkmark next to the name
    if 'src/app/settings.tsx' in file:
        content = content.replace(
            "<Text className={`font-black text-[22px] ${theme.textClass}`}>{profile?.full_name}</Text>",
            "<Text className={`font-black text-[22px] ${theme.textClass}`}>{profile?.full_name}</Text>\n            {profile?.is_verified && <CheckCircle size={20} color=\"#3b82f6\" className=\"ml-2\" />}"
        )
    elif 'src/app/profile.tsx' in file:
        content = content.replace(
            "<Text className={`font-black text-[24px] ${theme.textClass}`}>{profile?.full_name}</Text>",
            "<Text className={`font-black text-[24px] ${theme.textClass}`}>{profile?.full_name}</Text>\n            {profile?.is_verified && <CheckCircle size={22} color=\"#3b82f6\" className=\"ml-2\" />}"
        )
    elif 'src/app/user/[id].tsx' in file:
        content = content.replace(
            "<Text className={`font-black text-[22px] ${theme.textClass}`}>{userProfile?.full_name}</Text>",
            "<Text className={`font-black text-[22px] ${theme.textClass}`}>{userProfile?.full_name}</Text>\n            {userProfile?.is_verified && <CheckCircle size={20} color=\"#3b82f6\" className=\"ml-2\" />}"
        )
        
    with open(file, 'w') as f:
        f.write(content)

