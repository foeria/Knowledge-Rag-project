<script setup>
import { useChatStore } from '../stores/chat'
import { storeToRefs } from 'pinia'

const store = useChatStore()
const { conversations, currentChatId, currentView } = storeToRefs(store)
const { createNewChat, selectChat, deleteChat } = store

const handleDelete = (e, id) => {
  e.stopPropagation()
  if (confirm('确定要删除这个对话吗？')) {
    deleteChat(id)
  }
}
</script>

<template>
  <div class="flex flex-col w-64 h-full bg-gray-900 text-white border-r border-gray-800">
    <!-- Navigation Tabs -->
    <div class="flex p-2 gap-1 border-b border-gray-800">
      <button 
        @click="currentView = 'chat'"
        class="flex-1 py-2 text-sm rounded transition-colors flex items-center justify-center gap-2"
        :class="currentView === 'chat' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'"
      >
        <span>💬</span> 对话
      </button>
      <button 
        @click="currentView = 'knowledge'"
        class="flex-1 py-2 text-sm rounded transition-colors flex items-center justify-center gap-2"
        :class="currentView === 'knowledge' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'"
      >
        <span>📚</span> 知识库
      </button>
    </div>

    <!-- Chat Mode Sidebar Content -->
    <div v-if="currentView === 'chat'" class="flex flex-col flex-1 overflow-hidden">
      <!-- New Chat Button -->
      <div class="p-3">
        <button 
          @click="createNewChat"
          class="flex items-center gap-3 w-full px-3 py-3 rounded-md border border-white/20 hover:bg-gray-800 transition-colors text-sm text-white mb-2"
        >
          <span class="text-xl">+</span>
          新对话
        </button>
      </div>

      <!-- Chat List -->
      <div class="flex-1 overflow-y-auto">
        <div class="flex flex-col gap-2 px-3 pb-3">
          <div 
            v-for="chat in conversations" 
            :key="chat.id"
            @click="selectChat(chat.id)"
            class="group relative flex items-center gap-3 px-3 py-3 rounded-md cursor-pointer hover:bg-[#2A2B32] transition-colors"
            :class="{ 'bg-[#343541]': currentChatId === chat.id }"
          >
            <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            <div class="flex-1 text-sm overflow-hidden text-ellipsis whitespace-nowrap pr-4">
              {{ chat.title }}
            </div>
            
            <!-- Delete Button (visible on hover or active) -->
            <button 
              @click="(e) => handleDelete(e, chat.id)"
              class="absolute right-2 text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
              :class="{ 'opacity-100': currentChatId === chat.id }"
            >
              <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Knowledge Mode Sidebar Content (Optional, maybe just info) -->
    <div v-else class="flex-1 p-4 text-gray-400 text-sm text-center mt-10">
      <p>在右侧管理您的知识库。</p>
      <p class="mt-2">您可以创建多个知识库，并上传 PDF 或 TXT 文档。</p>
    </div>

    <!-- User Profile / Settings (Bottom) -->
    <div class="p-3 border-t border-white/20">
      <div class="flex items-center gap-3 px-3 py-3 rounded-md hover:bg-gray-800 cursor-pointer transition-colors">
        <div class="w-8 h-8 bg-green-600 rounded-sm flex items-center justify-center text-white font-bold">
          U
        </div>
        <div class="text-sm font-bold">User</div>
      </div>
    </div>
  </div>
</template>
