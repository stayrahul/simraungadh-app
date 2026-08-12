import re

with open('src/app/admin.tsx', 'r') as f:
    content = f.read()

# Add editingVerified state
content = content.replace(
    "const [editingPoints, setEditingPoints] = useState('');",
    "const [editingPoints, setEditingPoints] = useState('');\n  const [editingVerified, setEditingVerified] = useState(false);"
)

# Update handleSelectUser
content = content.replace(
    "setEditingPoints(user.civic_points?.toString() || '0');",
    "setEditingPoints(user.civic_points?.toString() || '0');\n    setEditingVerified(user.is_verified || false);"
)

# Update handleSaveRole
content = content.replace(
    "civic_points: parseInt(editingPoints) || 0",
    "civic_points: parseInt(editingPoints) || 0,\n        is_verified: editingVerified"
)

# Add Badge Toggle UI in User Modal (around line 742)
badge_ui = """
                  <View className="mb-8">
                    <Text className={`font-bold text-[12px] uppercase tracking-widest mb-3 ml-1 ${theme.textSecondaryClass}`}>Verification Badge</Text>
                    <TouchableOpacity onPress={() => {Haptics.selectionAsync(); setEditingVerified(!editingVerified);}} className={`flex-row items-center justify-between border rounded-[20px] px-5 py-4 ${editingVerified ? (theme.isDark ? 'bg-primary-500/10 border-primary-500/30' : 'bg-primary-50 border-primary-200') : theme.inputClass}`}>
                      <View className="flex-row items-center">
                        <CheckCircle size={20} color={editingVerified ? '#3b82f6' : '#94a3b8'} />
                        <Text className={`ml-3 font-bold text-[16px] ${theme.textClass}`}>Official Verified Badge</Text>
                      </View>
                      <View className={`w-12 h-7 rounded-full p-1 justify-center ${editingVerified ? 'bg-primary' : 'bg-slate-200 dark:bg-white/10'}`}>
                        <View className={`w-5 h-5 rounded-full bg-white transition-all ${editingVerified ? 'self-end' : 'self-start'}`} />
                      </View>
                    </TouchableOpacity>
                  </View>
"""

content = content.replace(
    "onChangeText={setEditingPoints} />\n                    </View>\n                  </View>\n\n                  <View className=\"flex-row gap-3 mb-10\">",
    f"onChangeText={{setEditingPoints}} />\n                    </View>\n                  </View>\n{badge_ui}\n                  <View className=\"flex-row gap-3 mb-10\">"
)

with open('src/app/admin.tsx', 'w') as f:
    f.write(content)
print("Updated admin.tsx for users.")
