import { Title } from "@solidjs/meta"
import { createFileRoute } from "@tanstack/solid-router"
import { For } from "solid-js"
import { Player } from "~/components/player"
import { BookmarkIcon } from "solid-radix-icons"

export const Route = createFileRoute("/articles")({
    component: ArticlesPage,
})

function ArticlesPage() {
    const featuredArticles = [
        {
            id: 1,
            title: "东方同音鉴：共同探索东方音乐的奇妙世界",
            excerpt: "东方同音鉴是一个专注于东方Project音乐的平台，我们致力于为爱好者提供最全面的音乐体验...",
            cover: "https://placehold.co/800x400/red/white?text=东方同音鉴",
            author: "灵梦",
            date: "2023-05-15",
            tags: ["平台介绍", "东方Project"],
            readTime: "5分钟"
        }
    ];

    const articles = [
        {
            id: 2,
            title: "ZUN的音乐创作历程：从PC-98到现在",
            excerpt: "作为东方Project的创始人，ZUN的音乐风格经历了怎样的变化？本文将带您回顾ZUN音乐创作的发展历程...",
            cover: "https://placehold.co/400x200/purple/white?text=ZUN音乐",
            author: "魔理沙",
            date: "2023-04-28",
            tags: ["音乐创作", "ZUN", "历史回顾"],
            readTime: "8分钟"
        },
        {
            id: 3,
            title: "东方同人音乐社团推荐：十大不能错过的社团",
            excerpt: "东方同人音乐社团众多，本文推荐十大不容错过的社团，带你领略不同风格的音乐魅力...",
            cover: "https://placehold.co/400x200/blue/white?text=同人社团",
            author: "爱丽丝",
            date: "2023-04-20",
            tags: ["社团推荐", "同人音乐"],
            readTime: "10分钟"
        },
        {
            id: 4,
            title: "东方风神录音乐赏析：自然与信仰的交响",
            excerpt: "东方风神录作为系列第十作，其音乐充满了自然与信仰的元素，本文将深入分析其音乐特点...",
            cover: "https://placehold.co/400x200/green/white?text=风神录",
            author: "早苗",
            date: "2023-04-15",
            tags: ["音乐赏析", "东方风神录"],
            readTime: "7分钟"
        },
        {
            id: 5,
            title: "专访Alstroemeria Records：电子音乐与东方的碰撞",
            excerpt: "作为最著名的东方同人音乐社团之一，Alstroemeria Records如何将电子音乐与东方元素完美融合？",
            cover: "https://placehold.co/400x200/orange/white?text=AR",
            author: "蕾米莉亚",
            date: "2023-04-10",
            tags: ["社团专访", "电子音乐"],
            readTime: "12分钟"
        },
        {
            id: 6,
            title: "东方音乐会回顾：上海幻想交响音乐会2023",
            excerpt: "2023年上海幻想交响音乐会盛大举行，本文带您回顾音乐会精彩瞬间与演出曲目...",
            cover: "https://placehold.co/400x200/pink/white?text=音乐会",
            author: "妖梦",
            date: "2023-04-05",
            tags: ["音乐会", "现场演出", "活动回顾"],
            readTime: "6分钟"
        }
    ];

    const popularTags = [
        "音乐赏析", "同人社团", "ZUN", "音乐会", "活动回顾", "专访",
        "电子音乐", "东方红魔乡", "东方风神录", "东方妖妖梦", "原声音乐"
    ];

    return (
        <div class="flex flex-col min-h-screen bg-gray-50">
            <div class="flex-1 overflow-auto">
                <div class="max-w-6xl mx-auto px-4 py-8">
                    <Title>文章 - 东方同音鉴</Title>

                    {/* 精选文章 */}
                    <div class="mb-10">
                        <h1 class="text-2xl font-bold text-gray-800 mb-6">文章</h1>

                        <div class="bg-white rounded-lg overflow-hidden shadow-md">
                            <For each={featuredArticles}>
                                {article => (
                                    <div class="flex flex-col md:flex-row">
                                        <div class="md:w-1/2">
                                            <img src={article.cover} alt={article.title} class="w-full h-64 md:h-full object-cover" />
                                        </div>
                                        <div class="p-6 md:w-1/2 flex flex-col justify-center">
                                            <div class="flex items-center text-xs text-gray-500 mb-2">
                                                <span class="bg-rose-100 text-rose-800 rounded-full px-2 py-0.5 mr-2">精选</span>
                                                <span>{article.date}</span>
                                                <span class="mx-2">•</span>
                                                <span>{article.readTime}</span>
                                            </div>
                                            <h2 class="text-xl font-bold text-gray-800 mb-3">{article.title}</h2>
                                            <p class="text-gray-600 mb-4">{article.excerpt}</p>
                                            <div class="flex items-center justify-between">
                                                <div class="flex items-center">
                                                    <div class="w-8 h-8 rounded-full bg-gray-300 mr-2"></div>
                                                    <span class="text-sm text-gray-700">{article.author}</span>
                                                </div>
                                                <button class="text-rose-600 font-medium text-sm hover:text-rose-700">阅读全文</button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </For>
                        </div>
                    </div>

                    <div class="flex flex-col lg:flex-row gap-8">
                        {/* 文章列表 */}
                        <div class="lg:w-2/3">
                            <div class="flex items-center justify-between mb-6">
                                <h2 class="text-xl font-bold text-gray-800">最新文章</h2>
                                <div class="flex space-x-2">
                                    <button class="text-sm text-gray-600 hover:text-gray-900">最新</button>
                                    <span class="text-gray-300">|</span>
                                    <button class="text-sm text-gray-600 hover:text-gray-900">热门</button>
                                </div>
                            </div>

                            <div class="space-y-6">
                                <For each={articles}>
                                    {article => (
                                        <div class="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow flex">
                                            <div class="w-1/3">
                                                <img src={article.cover} alt={article.title} class="w-full h-full object-cover" />
                                            </div>
                                            <div class="w-2/3 p-4">
                                                <div class="flex items-center text-xs text-gray-500 mb-2">
                                                    <span>{article.date}</span>
                                                    <span class="mx-2">•</span>
                                                    <span>{article.readTime}</span>
                                                </div>
                                                <h3 class="text-lg font-bold text-gray-800 mb-2">{article.title}</h3>
                                                <p class="text-gray-600 text-sm mb-3 line-clamp-2">{article.excerpt}</p>
                                                <div class="flex flex-wrap gap-1 mb-3">
                                                    <For each={article.tags}>
                                                        {tag => (
                                                            <span class="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">{tag}</span>
                                                        )}
                                                    </For>
                                                </div>
                                                <div class="flex items-center justify-between">
                                                    <div class="flex items-center">
                                                        <div class="w-6 h-6 rounded-full bg-gray-300 mr-2"></div>
                                                        <span class="text-xs text-gray-700">{article.author}</span>
                                                    </div>
                                                    <button class="text-rose-600 text-xs font-medium hover:text-rose-700">阅读全文</button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </For>
                            </div>

                            <div class="mt-8 flex justify-center">
                                <button class="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">
                                    加载更多
                                </button>
                            </div>
                        </div>

                        {/* 侧边栏 */}
                        <div class="lg:w-1/3 space-y-6">
                            {/* 搜索框 */}
                            <div class="bg-white rounded-lg shadow-sm p-4">
                                <h3 class="text-lg font-medium text-gray-800 mb-3">搜索文章</h3>
                                <div class="relative">
                                    <input
                                        type="text"
                                        placeholder="输入关键词搜索..."
                                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                                    />
                                    <button class="absolute right-2 top-2 text-gray-400 hover:text-gray-600">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            {/* 热门标签 */}
                            <div class="bg-white rounded-lg shadow-sm p-4">
                                <div class="flex items-center mb-3">
                                    <BookmarkIcon class="mr-2 text-gray-600" />
                                    <h3 class="text-lg font-medium text-gray-800">热门标签</h3>
                                </div>
                                <div class="flex flex-wrap gap-2">
                                    <For each={popularTags}>
                                        {tag => (
                                            <span class="text-sm bg-gray-100 text-gray-700 rounded-full px-3 py-1 hover:bg-gray-200 cursor-pointer">
                                                {tag}
                                            </span>
                                        )}
                                    </For>
                                </div>
                            </div>

                            {/* 推荐阅读 */}
                            <div class="bg-white rounded-lg shadow-sm p-4">
                                <div class="flex items-center mb-3">
                                    <BookmarkIcon class="mr-2 text-gray-600" />
                                    <h3 class="text-lg font-medium text-gray-800">推荐阅读</h3>
                                </div>
                                <div class="space-y-3">
                                    <div class="flex items-center">
                                        <div class="w-16 h-16 rounded overflow-hidden flex-shrink-0">
                                            <img src="https://placehold.co/100x100/red/white?text=推荐" alt="推荐文章" class="w-full h-full object-cover" />
                                        </div>
                                        <div class="ml-3">
                                            <h4 class="text-sm font-medium text-gray-800 line-clamp-2">解密东方Project中的音乐创作技巧</h4>
                                            <p class="text-xs text-gray-500 mt-1">2023-03-28</p>
                                        </div>
                                    </div>
                                    <div class="flex items-center">
                                        <div class="w-16 h-16 rounded overflow-hidden flex-shrink-0">
                                            <img src="https://placehold.co/100x100/blue/white?text=推荐" alt="推荐文章" class="w-full h-full object-cover" />
                                        </div>
                                        <div class="ml-3">
                                            <h4 class="text-sm font-medium text-gray-800 line-clamp-2">从传统到现代：东方音乐中的日本元素</h4>
                                            <p class="text-xs text-gray-500 mt-1">2023-03-20</p>
                                        </div>
                                    </div>
                                    <div class="flex items-center">
                                        <div class="w-16 h-16 rounded overflow-hidden flex-shrink-0">
                                            <img src="https://placehold.co/100x100/green/white?text=推荐" alt="推荐文章" class="w-full h-full object-cover" />
                                        </div>
                                        <div class="ml-3">
                                            <h4 class="text-sm font-medium text-gray-800 line-clamp-2">幻想乡的钢琴协奏曲：古典音乐版东方名曲</h4>
                                            <p class="text-xs text-gray-500 mt-1">2023-03-15</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <Player />
        </div>
    )
} 