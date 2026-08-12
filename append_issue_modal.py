import re

with open('src/app/admin.tsx', 'r') as f:
    content = f.read()

modal_ui = """
      {/* Edit Issue Modal */}
      <Modal visible={!!editingIssue} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
          <View className={`flex-1 justify-end ${theme.isDark ? 'bg-black/80' : 'bg-black/40'}`}>
            <View className={`rounded-t-[40px] p-6 h-[85%] ${theme.bgClass}`}>
              <View className="flex-row justify-between items-center mb-6">
                <Text className={`font-black text-2xl ${theme.textClass}`}>Edit Issue</Text>
                <TouchableOpacity onPress={() => setEditingIssue(null)} className={`p-2 rounded-full ${theme.isDark ? 'bg-white/10' : 'bg-slate-100'}`}><X size={20} color={theme.iconColor} /></TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text className={`font-bold text-[12px] mb-2 ${theme.textSecondaryClass}`}>Title</Text>
                <TextInput className={`border rounded-[20px] px-4 py-4 mb-4 ${theme.inputClass} ${theme.textClass}`} value={issueForm.title} onChangeText={(t) => setIssueForm({...issueForm, title:t})} />
                
                <Text className={`font-bold text-[12px] mb-2 ${theme.textSecondaryClass}`}>Description</Text>
                <TextInput className={`border rounded-[20px] px-4 py-4 mb-4 min-h-[120px] ${theme.inputClass} ${theme.textClass}`} value={issueForm.description} onChangeText={(t) => setIssueForm({...issueForm, description:t})} multiline textAlignVertical="top" />
                
                <Text className={`font-bold text-[12px] mb-2 ${theme.textSecondaryClass}`}>Category</Text>
                <TextInput className={`border rounded-[20px] px-4 py-4 mb-6 ${theme.inputClass} ${theme.textClass}`} value={issueForm.category} onChangeText={(t) => setIssueForm({...issueForm, category:t})} />
                
                <TouchableOpacity onPress={handleSaveIssue} className={`py-4 rounded-[20px] items-center bg-primary mb-10`}>
                  <Text className="font-bold text-white text-[16px]">Save Changes</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Role & Profile Editor Modal */}"""

content = content.replace(
    "{/* Role & Profile Editor Modal */}",
    modal_ui
)

with open('src/app/admin.tsx', 'w') as f:
    f.write(content)
