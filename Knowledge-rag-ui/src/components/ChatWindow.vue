<script setup>
import { ref, nextTick, watch, onMounted } from 'vue'
import { useChatStore } from '../stores/chat'
import { useKnowledgeStore } from '../stores/knowledge'
import { storeToRefs } from 'pinia'

const store = useChatStore()
const knowledgeStore = useKnowledgeStore()
const { messages, isSending, isUploading, selectedKbId } = storeToRefs(store)
const { knowledgeBases } = storeToRefs(knowledgeStore)
const { sendMessage, uploadFile } = store
const { fetchKnowledgeBases } = knowledgeStore

const inputContent = ref('')
const messagesContainer = ref(null)
const fileInput = ref(null)

// Auto scroll to bottom
const scrollToBottom = async () => {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

watch(messages, () => {
  scrollToBottom()
}, { deep: true })

onMounted(() => {
  scrollToBottom()
  fetchKnowledgeBases()
})

const handleSend = async () => {
  if (!inputContent.value.trim() || isSending.value) return
  
  const content = inputContent.value
  inputContent.value = ''
  
  // Reset textarea height
  const textarea = document.querySelector('textarea')
  if (textarea) textarea.style.height = 'auto'
  
  await sendMessage(content)
}

const handleKeydown = (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

const triggerUpload = () => {
  fileInput.value.click()
}

const handleFileChange = async (e) => {
  const file = e.target.files[0]
  if (file) {
    // Pass kbId to uploadFile if needed, but currently store uses selectedKbId?
    // Wait, store.uploadFile needs to be updated to use selectedKbId or pass it.
    // Let's update store.uploadFile to use selectedKbId.value
    // Actually, let's just pass it manually here if the store function signature allows, 
    // but the store function currently doesn't take kbId.
    // I will update the store function in a bit, or just rely on the fact that I'll update it to use the state.
    // For now, let's assume I'll update the store.
    await uploadFile(file)
    e.target.value = '' // Reset input
  }
}

// Auto resize textarea
const resizeTextarea = (e) => {
  const target = e.target
  target.style.height = 'auto'
  target.style.height = `${target.scrollHeight}px`
}
</script>

<template>
  <div class="flex flex-col flex-1 h-full bg-[#343541] relative">
    <!-- Top Bar: Knowledge Base Selector -->
    <div class="absolute top-0 left-0 w-full p-2 z-10 flex justify-center">
      <div class="bg-gray-800/80 backdrop-blur rounded-lg p-1 flex items-center gap-2 text-sm text-gray-300 border border-gray-700">
        <span>当前知识库:</span>
        <select v-model="selectedKbId" class="bg-transparent border-none outline-none text-white font-bold cursor-pointer">
          <option v-for="kb in knowledgeBases" :key="kb.id" :value="kb.id">
            {{ kb.name }}
          </option>
        </select>
      </div>
    </div>

    <!-- Messages Area -->
    <div ref="messagesContainer" class="flex-1 overflow-y-auto w-full pt-12">
      <div class="flex flex-col pb-32">
        <div 
          v-for="(msg, index) in messages" 
          :key="index"
          class="w-full border-b border-black/10 dark:border-gray-900/50 text-gray-800 dark:text-gray-100 group"
          :class="msg.role === 'assistant' ? 'bg-[#444654]' : 'bg-[#343541]'"
        >
          <div class="text-base gap-4 md:gap-6 md:max-w-2xl lg:max-w-xl xl:max-w-3xl p-4 md:py-6 flex lg:px-0 m-auto">
            <!-- Avatar -->
            <div class="w-[30px] flex flex-col relative items-end">
              <div 
                class="relative h-[30px] w-[30px] p-1 rounded-sm text-white flex items-center justify-center"
                :class="msg.role === 'assistant' ? 'bg-green-500' : 'bg-[#5436DA]'"
              >
                <span v-if="msg.role === 'assistant'">
                  <svg stroke="currentColor" fill="none" stroke-width="1.5" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M12 2a10 10 0 1 0 10 10H12V2z"></path><path d="M12 12a10 10 0 0 1 10 10H12V12z"></path><path d="M12 12a10 10 0 0 0-10 10h10V12z"></path><path d="M12 12a10 10 0 0 1-10-10h10v10z"></path></svg>
                </span>
                <span v-else>U</span>
              </div>
            </div>
            
            <!-- Content -->
            <div class="relative flex-1 overflow-hidden">
              <div class="whitespace-pre-wrap">{{ msg.content }}</div>
            </div>
          </div>
        </div>
        
        <!-- Loading Indicator -->
        <div v-if="isSending" class="w-full border-b border-black/10 dark:border-gray-900/50 bg-[#444654] text-gray-100">
          <div class="text-base gap-4 md:gap-6 md:max-w-2xl lg:max-w-xl xl:max-w-3xl p-4 md:py-6 flex lg:px-0 m-auto">
             <div class="w-[30px] flex flex-col relative items-end">
               <div class="relative h-[30px] w-[30px] p-1 rounded-sm bg-green-500 text-white flex items-center justify-center">
                 <svg class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                   <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                   <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                 </svg>
               </div>
             </div>
             <div class="relative flex-1 overflow-hidden flex items-center">
               <span class="animate-pulse">思考中...</span>
             </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Input Area -->
    <div class="absolute bottom-0 left-0 w-full bg-gradient-to-t from-[#343541] via-[#343541] to-transparent pt-10 pb-6 px-4">
      <div class="md:max-w-2xl lg:max-w-xl xl:max-w-3xl m-auto">
        <div class="relative flex h-full flex-1 items-stretch md:flex-col">
          <div class="flex flex-col w-full py-2 flex-grow md:py-3 md:pl-4 relative border border-black/10 bg-white dark:border-gray-900/50 dark:text-white dark:bg-[#40414F] rounded-md shadow-[0_0_10px_rgba(0,0,0,0.10)] dark:shadow-[0_0_15px_rgba(0,0,0,0.10)]">
            
            <!-- Upload Button -->
            <button 
              @click="triggerUpload"
              class="absolute left-2 top-2 md:top-3 p-1 rounded-md text-gray-400 hover:text-gray-200 hover:bg-gray-900/50 transition-colors"
              :disabled="isUploading"
              title="上传文档 (PDF/TXT)"
            >
              <svg v-if="!isUploading" stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
              <svg v-else class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </button>
            <input type="file" ref="fileInput" @change="handleFileChange" class="hidden" accept=".pdf,.txt,.md" />

            <textarea
              v-model="inputContent"
              @keydown="handleKeydown"
              @input="resizeTextarea"
              tabindex="0"
              rows="1"
              class="m-0 w-full resize-none border-0 bg-transparent p-0 pl-10 pr-10 focus:ring-0 focus-visible:ring-0 dark:bg-transparent md:pl-8"
              style="max-height: 200px; height: 24px; overflow-y: hidden;"
              placeholder="发送消息..."
            ></textarea>
            
            <button
              @click="handleSend"
              class="absolute p-1 rounded-md text-gray-500 bottom-1.5 right-1 md:bottom-2.5 md:right-2 hover:bg-gray-100 dark:hover:text-gray-400 dark:hover:bg-gray-900 disabled:hover:bg-transparent dark:disabled:hover:bg-transparent"
              :disabled="!inputContent.trim() || isSending"
            >
              <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4 mr-1" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            </button>
          </div>
        </div>
        <div class="px-2 py-2 text-center text-xs text-gray-600 dark:text-gray-300 md:px-[60px]">
          <span>私人知识库 AI 助手。模型运行在本地，请耐心等待回复。</span>
        </div>
      </div>
    </div>
  </div>
</template>
