<script setup>
import { onMounted } from 'vue'
import Sidebar from './components/Sidebar.vue'
import ChatWindow from './components/ChatWindow.vue'
import KnowledgeManager from './components/KnowledgeManager.vue'
import { useChatStore } from './stores/chat'
import { storeToRefs } from 'pinia'

const store = useChatStore()
const { currentView } = storeToRefs(store)

onMounted(() => {
  store.init()
})
</script>

<template>
  <div class="flex h-screen w-screen overflow-hidden bg-[#343541]">
    <Sidebar />
    <ChatWindow v-if="currentView === 'chat'" />
    <KnowledgeManager v-else-if="currentView === 'knowledge'" />
  </div>
</template>

<style>
body {
  margin: 0;
  padding: 0;
  background-color: #343541;
}
</style>
