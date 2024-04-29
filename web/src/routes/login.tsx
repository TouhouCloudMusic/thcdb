export default function Login() {
	const inputClass = "border-zinc-200 border-2 rounded-sm	pl-1.5 bg-zinc-100";
	// const btnClass =
	// "border-zinc-200 w-16 h-8 rounded-md border-2 text-zinc-500";
	const submitBtnClass = "bg-green-500 text-white w-16 h-8 rounded-md ";
	const linkClass = "text-blue-500";
	return (
		<>
			<main class="flex justify-center">
				<div class="flex flex-col gap-16">
					<form
						action=""
						class="flex w-96 flex-col items-center justify-center gap-6 rounded-lg bg-white p-8">
						<h1 class="text-2xl">登录</h1>
						<input
							type="text"
							name="username"
							placeholder="用户名 / 邮箱"
							class={inputClass}
						/>
						<input
							type="text"
							name="password"
							placeholder="密码"
							class={inputClass}
						/>
						<button
							type="submit"
							class={submitBtnClass}>
							登录
						</button>
						<p>
							没有账号？转到
							<a
								href=""
								class={linkClass}>
								注册
							</a>
						</p>

						<a
							href=""
							class={linkClass}>
							忘记密码
						</a>
					</form>
					<form
						action=""
						class="flex w-96 flex-col items-center justify-center gap-6 rounded-lg bg-white p-8">
						<h1 class="text-2xl">注册</h1>
						<input
							type="text"
							name="username"
							placeholder="用户名"
							class={inputClass}
						/>
						<input
							type="text"
							name="username"
							placeholder="邮箱"
							class={inputClass}
						/>
						<input
							type="text"
							name="password"
							placeholder="密码"
							class={inputClass}
						/>
						<input
							type="text"
							name="password"
							placeholder="重复密码"
							class={inputClass}
						/>

						<button
							type="submit"
							class={submitBtnClass}>
							注册
						</button>
						<p>
							已有账号？转到
							<a
								href=""
								class={linkClass}>
								登录
							</a>
						</p>
					</form>
				</div>
			</main>
		</>
	);
}
