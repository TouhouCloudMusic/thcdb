import { Title } from "@solidjs/meta"
import { createFileRoute } from "@tanstack/solid-router"
import { For } from "solid-js"
import { Player } from "~/components/player"
import { HeartIcon, ChatBubbleIcon, Link1Icon } from "solid-radix-icons"

export const Route = createFileRoute("/feeds")({
    component: FeedsPage,
})

function FeedsPage() {
    const feeds = [
        {
            id: 1,
            author: {
                name: "ZUN",
                avatar: "https://placehold.co/40x40/gray/white?text=ZUN",
                verified: true
            },
            content: "刚刚完成了新曲的创作，这次是灵梦的新主题曲，期待大家的反馈！",
            time: "10分钟前",
            likes: 142,
            comments: 38,
            shares: 12,
            media: null
        },
        {
            id: 2,
            author: {
                name: "Alstroemeria Records",
                avatar: "https://placehold.co/40x40/purple/white?text=AR",
                verified: true
            },
            content: "我们的新专辑《幻想的交响》已经上线！这次收录了10首东方Project的电子改编曲目，快来听听吧！",
            time: "2小时前",
            likes: 324,
            comments: 57,
            shares: 89,
            media: {
                type: "image",
                url: "https://placehold.co/800x400/purple/white?text=幻想的交响"
            }
        },
        {
            id: 3,
            author: {
                name: "东方音乐节官方",
                avatar: "https://placehold.co/40x40/red/white?text=音乐节",
                verified: true
            },
            content: "2023东方幻想音乐节门票现已开始预售！今年我们邀请了ZUN、暁Records、FELT等知名音乐人和社团参与演出，不要错过这场幻想盛宴！",
            time: "昨天",
            likes: 892,
            comments: 245,
            shares: 378,
            media: {
                type: "image",
                url: "https://placehold.co/800x400/red/white?text=东方幻想音乐节"
            }
        },
        {
            id: 4,
            author: {
                name: "魔理沙",
                avatar: "https://placehold.co/40x40/black/white?text=魔理沙",
                verified: false
            },
            content: "最近在练习《恋色マスタースパーク》的吉他solo，真的超难！有没有大佬分享一下弹奏技巧？",
            time: "2天前",
            likes: 78,
            comments: 52,
            shares: 5,
            media: null
        },
        {
            id: 5,
            author: {
                name: "幻想乡音乐分享",
                avatar: "https://placehold.co/40x40/blue/white?text=分享",
                verified: false
            },
            content: "【每日推荐】今天为大家推荐一首经典：《亡き王女の為のセプテット》（献给逝去公主的七重奏）。这首曲子出自东方红魔乡，是蕾米莉亚的主题曲，华丽的旋律让人回味无穷。",
            time: "3天前",
            likes: 215,
            comments: 43,
            shares: 67,
            media: {
                type: "audio",
                url: "#",
                thumbnail: "https://placehold.co/800x400/blue/white?text=七重奏"
            }
        }
    ];

    const suggestedUsers = [
        { name: "上海爱丽丝幻乐团", avatar: "https://placehold.co/50x50/red/white?text=上海" },
        { name: "SOUND HOLIC", avatar: "https://placehold.co/50x50/orange/white?text=SH" },
        { name: "东方交响乐团", avatar: "https://placehold.co/50x50/green/white?text=交响乐" }
    ];

    const trends = [
        { tag: "#东方幻想音乐节", posts: "2.5k" },
        { tag: "#幻想的交响", posts: "1.8k" },
        { tag: "#ZUN新曲", posts: "1.2k" },
        { tag: "#恋色マスタースパーク", posts: "954" },
        { tag: "#东方电音", posts: "856" }
    ];

    return (
        <div class="flex flex-col min-h-screen bg-gray-50">
            <div class="flex-1 overflow-auto">
                <div class="max-w-6xl mx-auto px-4 py-8">
                    <Title>动态 - 东方同音鉴</Title>

                    <div class="flex flex-col md:flex-row gap-8">
                        {/* 左侧面板 */}
                        <div class="md:w-1/4 space-y-6">
                            <div class="bg-white rounded-lg shadow-sm p-4">
                                <h3 class="text-lg font-bold text-gray-800 mb-4">个人中心</h3>
                                <div class="flex items-center mb-4">
                                    <div class="w-12 h-12 rounded-full overflow-hidden">
                                        <img src="https://placehold.co/100x100/red/white?text=头像" alt="用户头像" class="w-full h-full object-cover" />
                                    </div>
                                    <div class="ml-3">
                                        <h4 class="text-sm font-medium text-gray-800">幻想乡音乐爱好者</h4>
                                        <p class="text-xs text-gray-500">@touhoufan</p>
                                    </div>
                                </div>
                                <div class="flex justify-between text-sm text-gray-600">
                                    <div class="text-center">
                                        <div class="font-medium">42</div>
                                        <div class="text-xs">关注</div>
                                    </div>
                                    <div class="text-center">
                                        <div class="font-medium">128</div>
                                        <div class="text-xs">粉丝</div>
                                    </div>
                                    <div class="text-center">
                                        <div class="font-medium">56</div>
                                        <div class="text-xs">动态</div>
                                    </div>
                                </div>
                            </div>

                            <div class="bg-white rounded-lg shadow-sm p-4">
                                <h3 class="text-lg font-bold text-gray-800 mb-4">热门话题</h3>
                                <div class="space-y-3">
                                    <For each={trends}>
                                        {trend => (
                                            <div class="flex justify-between items-center">
                                                <a href="#" class="text-sm font-medium text-rose-600 hover:text-rose-700">{trend.tag}</a>
                                                <span class="text-xs text-gray-500">{trend.posts}帖</span>
                                            </div>
                                        )}
                                    </For>
                                    <a href="#" class="block text-xs text-gray-500 hover:text-gray-700 mt-2">查看更多</a>
                                </div>
                            </div>

                            <div class="bg-white rounded-lg shadow-sm p-4">
                                <h3 class="text-lg font-bold text-gray-800 mb-4">推荐关注</h3>
                                <div class="space-y-4">
                                    <For each={suggestedUsers}>
                                        {user => (
                                            <div class="flex justify-between items-center">
                                                <div class="flex items-center">
                                                    <div class="w-8 h-8 rounded-full overflow-hidden">
                                                        <img src={user.avatar} alt={user.name} class="w-full h-full object-cover" />
                                                    </div>
                                                    <span class="ml-2 text-sm font-medium text-gray-800">{user.name}</span>
                                                </div>
                                                <button class="text-xs bg-rose-600 text-white px-2 py-1 rounded-full hover:bg-rose-700">关注</button>
                                            </div>
                                        )}
                                    </For>
                                </div>
                            </div>
                        </div>

                        {/* 中间动态流 */}
                        <div class="md:w-1/2">
                            <div class="bg-white rounded-lg shadow-sm p-4 mb-6">
                                <div class="flex">
                                    <div class="w-10 h-10 rounded-full overflow-hidden">
                                        <img src="https://placehold.co/100x100/red/white?text=头像" alt="用户头像" class="w-full h-full object-cover" />
                                    </div>
                                    <div class="ml-3 flex-1">
                                        <textarea
                                            placeholder="分享你的音乐动态..."
                                            class="w-full border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent resize-none"
                                            rows="3"
                                        ></textarea>
                                        <div class="flex justify-between mt-3">
                                            <div class="flex space-x-2">
                                                <button class="text-gray-500 p-1 rounded-full hover:bg-gray-100">
                                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                </button>
                                                <button class="text-gray-500 p-1 rounded-full hover:bg-gray-100">
                                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                </button>
                                                <button class="text-gray-500 p-1 rounded-full hover:bg-gray-100">
                                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                                    </svg>
                                                </button>
                                            </div>
                                            <button class="px-4 py-1 bg-rose-600 text-white text-sm rounded-full hover:bg-rose-700">
                                                发布
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="space-y-6">
                                <For each={feeds}>
                                    {feed => (
                                        <div class="bg-white rounded-lg shadow-sm p-4">
                                            <div class="flex justify-between mb-3">
                                                <div class="flex items-center">
                                                    <div class="w-10 h-10 rounded-full overflow-hidden">
                                                        <img src={feed.author.avatar} alt={feed.author.name} class="w-full h-full object-cover" />
                                                    </div>
                                                    <div class="ml-3">
                                                        <div class="flex items-center">
                                                            <h4 class="text-sm font-medium text-gray-800">{feed.author.name}</h4>
                                                            {feed.author.verified && (
                                                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 ml-1 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                                                                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                                </svg>
                                                            )}
                                                        </div>
                                                        <p class="text-xs text-gray-500">{feed.time}</p>
                                                    </div>
                                                </div>
                                                <button class="text-gray-400 hover:text-gray-600">
                                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                                                    </svg>
                                                </button>
                                            </div>

                                            <p class="text-gray-800 mb-3">{feed.content}</p>

                                            {feed.media && (
                                                <div class="mb-3">
                                                    {feed.media.type === "image" && (
                                                        <div class="rounded-lg overflow-hidden">
                                                            <img src={feed.media.url} alt="" class="w-full h-auto" />
                                                        </div>
                                                    )}
                                                    {feed.media.type === "audio" && (
                                                        <div class="rounded-lg overflow-hidden bg-gray-100 p-3">
                                                            <div class="flex items-center">
                                                                <div class="w-16 h-16 bg-gray-200 rounded-md overflow-hidden mr-3">
                                                                    <img src={feed.media.thumbnail} alt="" class="w-full h-full object-cover" />
                                                                </div>
                                                                <div class="flex-1">
                                                                    <h4 class="text-sm font-medium text-gray-800">献给逝去公主的七重奏</h4>
                                                                    <p class="text-xs text-gray-500">东方红魔乡 - ZUN</p>
                                                                    <div class="flex items-center mt-1">
                                                                        <button class="text-rose-600 mr-2">
                                                                            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                            </svg>
                                                                        </button>
                                                                        <div class="h-1 flex-1 bg-gray-300 rounded-full">
                                                                            <div class="h-1 w-1/3 bg-rose-600 rounded-full"></div>
                                                                        </div>
                                                                        <span class="text-xs text-gray-500 ml-2">1:28/4:32</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <div class="flex border-t border-gray-100 pt-3">
                                                <button class="flex items-center text-gray-500 hover:text-rose-600 flex-1 justify-center">
                                                    <HeartIcon class="h-5 w-5 mr-1" />
                                                    <span class="text-xs">{feed.likes}</span>
                                                </button>
                                                <button class="flex items-center text-gray-500 hover:text-rose-600 flex-1 justify-center">
                                                    <ChatBubbleIcon class="h-5 w-5 mr-1" />
                                                    <span class="text-xs">{feed.comments}</span>
                                                </button>
                                                <button class="flex items-center text-gray-500 hover:text-rose-600 flex-1 justify-center">
                                                    <Link1Icon class="h-5 w-5 mr-1" />
                                                    <span class="text-xs">{feed.shares}</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </For>
                            </div>

                            <div class="mt-6 flex justify-center">
                                <button class="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">
                                    加载更多
                                </button>
                            </div>
                        </div>

                        {/* 右侧推荐 */}
                        <div class="md:w-1/4">
                            <div class="bg-white rounded-lg shadow-sm p-4 sticky top-4">
                                <h3 class="text-lg font-bold text-gray-800 mb-4">热门音乐</h3>
                                <div class="space-y-3">
                                    <div class="flex items-center">
                                        <div class="w-12 h-12 rounded overflow-hidden flex-shrink-0">
                                            <img src="https://placehold.co/100x100/red/white?text=1" alt="热门音乐" class="w-full h-full object-cover" />
                                        </div>
                                        <div class="ml-3">
                                            <h4 class="text-sm font-medium text-gray-800 line-clamp-1">深秘的萃梦想</h4>
                                            <p class="text-xs text-gray-500">ZUN</p>
                                        </div>
                                    </div>
                                    <div class="flex items-center">
                                        <div class="w-12 h-12 rounded overflow-hidden flex-shrink-0">
                                            <img src="https://placehold.co/100x100/purple/white?text=2" alt="热门音乐" class="w-full h-full object-cover" />
                                        </div>
                                        <div class="ml-3">
                                            <h4 class="text-sm font-medium text-gray-800 line-clamp-1">Bad Apple!!</h4>
                                            <p class="text-xs text-gray-500">Alstroemeria Records</p>
                                        </div>
                                    </div>
                                    <div class="flex items-center">
                                        <div class="w-12 h-12 rounded overflow-hidden flex-shrink-0">
                                            <img src="https://placehold.co/100x100/blue/white?text=3" alt="热门音乐" class="w-full h-full object-cover" />
                                        </div>
                                        <div class="ml-3">
                                            <h4 class="text-sm font-medium text-gray-800 line-clamp-1">亡き王女の為のセプテット</h4>
                                            <p class="text-xs text-gray-500">ZUN</p>
                                        </div>
                                    </div>
                                    <div class="flex items-center">
                                        <div class="w-12 h-12 rounded overflow-hidden flex-shrink-0">
                                            <img src="https://placehold.co/100x100/green/white?text=4" alt="热门音乐" class="w-full h-full object-cover" />
                                        </div>
                                        <div class="ml-3">
                                            <h4 class="text-sm font-medium text-gray-800 line-clamp-1">ネクロファンタジア</h4>
                                            <p class="text-xs text-gray-500">ZUN</p>
                                        </div>
                                    </div>
                                    <div class="flex items-center">
                                        <div class="w-12 h-12 rounded overflow-hidden flex-shrink-0">
                                            <img src="https://placehold.co/100x100/orange/white?text=5" alt="热门音乐" class="w-full h-full object-cover" />
                                        </div>
                                        <div class="ml-3">
                                            <h4 class="text-sm font-medium text-gray-800 line-clamp-1">神々が恋した幻想郷</h4>
                                            <p class="text-xs text-gray-500">ZUN</p>
                                        </div>
                                    </div>
                                </div>
                                <a href="#" class="block text-xs text-rose-600 hover:text-rose-700 mt-3 text-right">查看更多</a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <Player />
        </div>
    )
} 