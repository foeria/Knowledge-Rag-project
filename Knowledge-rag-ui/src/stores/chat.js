import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useChatStore = defineStore('chat', () => {
  // State
  const conversations = ref([])
  const currentChatId = ref(null)
  const isSending = ref(false)
  const isUploading = ref(false)
  const currentView = ref('chat') // 'chat' | 'knowledge'
  const selectedKbId = ref(null) // 当前对话使用的知识库 ID

  // Getters
  const currentChat = computed(() => {
    return conversations.value.find(c => c.id === currentChatId.value)
  })

  const messages = computed(() => {
    return currentChat.value ? currentChat.value.messages : []
  })

  // Actions
  async function init() {
    // Load from localStorage if available
    const stored = localStorage.getItem('rag_conversations')
    if (stored) {
      conversations.value = JSON.parse(stored)
      if (conversations.value.length > 0) {
        currentChatId.value = conversations.value[0].id
      }
    } else {
      createNewChat()
    }
    
    // 初始化时，从后端获取可用的知识库，选择第一个
    try {
      const res = await fetch('http://localhost:3000/api/knowledge-bases')
      const kbList = await res.json()
      if (kbList && kbList.length > 0) {
        selectedKbId.value = kbList[0].id
      }
    } catch (error) {
      console.warn('Failed to fetch knowledge bases on init:', error)
    }
  }

  function save() {
    localStorage.setItem('rag_conversations', JSON.stringify(conversations.value))
  }

  function createNewChat() {
    const newChat = {
      id: Date.now().toString(),
      title: '新对话',
      messages: [
        { role: 'assistant', content: '你好！我是你的私人知识库助手。你可以上传文档并向我提问。' }
      ]
    }
    conversations.value.unshift(newChat)
    currentChatId.value = newChat.id
    save()
  }

  function deleteChat(id) {
    conversations.value = conversations.value.filter(c => c.id !== id)
    if (currentChatId.value === id) {
      if (conversations.value.length > 0) {
        currentChatId.value = conversations.value[0].id
      } else {
        createNewChat()
      }
    }
    save()
  }

  function selectChat(id) {
    currentChatId.value = id
  }

  async function sendMessage(content) {
    if (!content.trim() || isSending.value) return

    const chat = currentChat.value
    if (!chat) return

    // 检查是否有可用的知识库
    if (!selectedKbId.value) {
      chat.messages.push({ 
        role: 'assistant', 
        content: '❌ 暂无可用的知识库。请先在"知识库"页面创建一个知识库。' 
      })
      save()
      return
    }

    // Add user message
    chat.messages.push({ role: 'user', content })
    isSending.value = true
    save()

    try {
      // 使用选中的知识库 ID
      const response = await fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          question: content,
          kbId: selectedKbId.value || null
        })
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.error || `Server error: ${response.status}`)
      }

      const data = await response.json()
      
      // Add assistant message
      chat.messages.push({ role: 'assistant', content: data.answer })
      
      // Update title if it's the first user message
      if (chat.messages.length === 4) { // system + user + assistant + user again
        chat.title = content.slice(0, 20) + (content.length > 20 ? '...' : '')
      }
      
      save()
    } catch (error) {
      console.error('Error sending message:', error)
      chat.messages.push({ role: 'assistant', content: `❌ 出错了: ${error.message}` })
    } finally {
      isSending.value = false
    }
  }

  async function uploadFile(file) {
    if (!file) return
    
    // 如果没有选中知识库，提示用户先创建
    if (!selectedKbId.value) {
      if (currentChat.value) {
        currentChat.value.messages.push({ 
          role: 'assistant', 
          content: '❌ 请先创建或选择一个知识库，然后再上传文件。' 
        })
        save()
      }
      return false
    }
    
    isUploading.value = true
    
    const formData = new FormData()
    formData.append('file', file)
    formData.append('kbId', selectedKbId.value)

    try {
      const response = await fetch('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) throw new Error('Upload failed')

      const data = await response.json()
      
      // Notify user in chat
      if (currentChat.value) {
        currentChat.value.messages.push({ 
          role: 'assistant', 
          content: `✅ 文件 "${file.name}" 上传成功！已加入知识库，你可以开始提问了。` 
        })
        save()
      }
      return true
    } catch (error) {
      console.error('Error uploading file:', error)
      if (currentChat.value) {
        currentChat.value.messages.push({ 
          role: 'assistant', 
          content: `❌ 文件 "${file.name}" 上传失败。` 
        })
      }
      return false
    } finally {
      isUploading.value = false
    }
  }

  return {
    conversations,
    currentChatId,
    currentChat,
    messages,
    isSending,
    isUploading,
    currentView,
    selectedKbId,
    init,
    createNewChat,
    deleteChat,
    selectChat,
    sendMessage,
    uploadFile
  }
})
