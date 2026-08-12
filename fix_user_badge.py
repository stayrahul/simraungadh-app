import re

with open('src/app/user/[id].tsx', 'r') as f:
    content = f.read()

# Add CheckCircle2 to imports
content = content.replace(
    "import { ChevronLeft, MapPin, Calendar, Activity, Info, Users, Flag, UserPlus, UserMinus, Shield } from 'lucide-react-native';",
    "import { ChevronLeft, MapPin, Calendar, Activity, Info, Users, Flag, UserPlus, UserMinus, Shield, CheckCircle2 } from 'lucide-react-native';"
)

content = content.replace(
    "<Text className={`font-black text-[22px] ${theme.textClass}`}>{userProfile?.full_name}</Text>",
    "<Text className={`font-black text-[22px] ${theme.textClass}`}>{userProfile?.full_name}</Text>\n            {userProfile?.is_verified && <CheckCircle2 size={20} color=\"#3b82f6\" style={{ marginLeft: 6 }} />}"
)

with open('src/app/user/[id].tsx', 'w') as f:
    f.write(content)
