# -*- coding: utf-8 -*-
import tkinter as tk
import tkinter.ttk as ttk
import tkinter.scrolledtext as scrolledtext
import tkinter.messagebox as messagebox
import tkinter.filedialog as filedialog # 用于选择目录
import subprocess
import os
import shlex # 用于安全分割命令行参数，尽管这里我们主要用列表形式传递
import sys
import platform
import re # 导入正则表达式模块用于解析
import codecs # 用于处理编码问题

class SimpleGitApp:
    def __init__(self, root):
        self.root = root
        root.title("简易 Git 图形界面 (已修复状态显示)") # 更新标题
        # 增加窗口大小以适应更多控件
        root.geometry("950x780")

        self.repo_path = os.getcwd() # 初始仓库路径为当前目录

        # --- 主题和样式 (可选) ---
        style = ttk.Style()
        try:
            if platform.system() == "Windows":
                style.theme_use('vista') # 或者 'xpnative'
            elif platform.system() == "Darwin": # macOS
                style.theme_use('aqua')
            else:
                style.theme_use('clam') # 一个比较通用的主题
        except tk.TclError:
            print("Info: Default Tk theme will be used.")


        # --- 框架布局 ---
        # 仓库和分支控制框架 (顶部)
        repo_branch_frame = ttk.Frame(root, padding="5")
        repo_branch_frame.pack(fill=tk.X, padx=10, pady=(10, 0))
        repo_branch_frame.columnconfigure(1, weight=1) # 让路径和下拉框可以扩展

        # 主框架 (包含状态和操作区域)
        main_frame = ttk.Frame(root, padding="10")
        main_frame.pack(fill=tk.BOTH, expand=True, padx=10)
        main_frame.columnconfigure(0, weight=3) # 状态区分配更多权重
        main_frame.columnconfigure(1, weight=1) # 操作区分配较少权重
        main_frame.rowconfigure(0, weight=1) # 行配置权重，让内容可以垂直扩展

        # 命令输出框架 (底部)
        output_frame = ttk.LabelFrame(root, text="命令输出 / 消息", padding="10", height=150)
        output_frame.pack(fill=tk.BOTH, expand=False, padx=10, pady=(5, 10))
        output_frame.rowconfigure(0, weight=1)
        output_frame.columnconfigure(0, weight=1)


        # --- 仓库和分支控制控件 ---
        # 第 0 行: 选择仓库
        ttk.Button(repo_branch_frame, text="选择仓库目录", command=self.select_repository).grid(row=0, column=0, padx=(0, 5), pady=2)
        self.repo_path_label_var = tk.StringVar(value=f"当前仓库: {self.repo_path}")
        ttk.Label(repo_branch_frame, textvariable=self.repo_path_label_var, anchor=tk.W, relief=tk.SUNKEN, padding=(2,2)).grid(row=0, column=1, columnspan=5, sticky="ew", padx=5, pady=2) # columnspan 调整

        # 第 1 行: 显示当前分支
        ttk.Label(repo_branch_frame, text="当前分支:").grid(row=1, column=0, sticky="e", padx=(0, 5), pady=2)
        self.current_branch_label_var = tk.StringVar(value="...")
        ttk.Label(repo_branch_frame, textvariable=self.current_branch_label_var, anchor=tk.W, font=('TkDefaultFont', 10, 'bold')).grid(row=1, column=1, columnspan=5, sticky="w", padx=5, pady=2) # columnspan 调整

        # 第 2 行: 切换分支
        ttk.Label(repo_branch_frame, text="切换到分支:").grid(row=2, column=0, sticky="e", padx=(0, 5), pady=2)
        self.branch_combobox = ttk.Combobox(repo_branch_frame, state="readonly", width=45) # 下拉列表
        self.branch_combobox.grid(row=2, column=1, sticky="ew", padx=5, pady=2) # columnspan=1
        ttk.Button(repo_branch_frame, text="切换", command=self.switch_branch).grid(row=2, column=2, padx=5, pady=2)
        ttk.Button(repo_branch_frame, text="刷新列表", command=self.update_branch_info).grid(row=2, column=3, padx=5, pady=2)
        ttk.Button(repo_branch_frame, text="抓取更新(Fetch)", command=self.fetch_remote).grid(row=2, column=4, padx=5, pady=2)

        # 第 3 行: 创建分支
        ttk.Label(repo_branch_frame, text="新分支名称:").grid(row=3, column=0, sticky="e", padx=(0, 5), pady=5)
        self.new_branch_entry = ttk.Entry(repo_branch_frame, width=47) # 输入框
        self.new_branch_entry.grid(row=3, column=1, sticky="ew", padx=5, pady=5)
        ttk.Button(repo_branch_frame, text="创建并切换", command=self.create_and_switch_branch).grid(row=3, column=2, columnspan=3, padx=5, pady=5, sticky="w") # 合并后面几列

        # 第 4 行: 删除分支
        self.delete_branch_frame = ttk.Frame(repo_branch_frame) # 使用 Frame 组合按钮
        self.delete_branch_frame.grid(row=4, column=0, columnspan=5, pady=5, sticky="w") # 跨越所有列并左对齐
        ttk.Label(self.delete_branch_frame, text="删除选中分支:").pack(side=tk.LEFT, padx=(0, 5))
        ttk.Button(self.delete_branch_frame, text="仅本地 (-d)", command=lambda: self.delete_local_branch(force=False)).pack(side=tk.LEFT, padx=5)
        ttk.Button(self.delete_branch_frame, text="强制本地 (-D)", command=lambda: self.delete_local_branch(force=True)).pack(side=tk.LEFT, padx=5)
        ttk.Button(self.delete_branch_frame, text="远程 (origin)", command=self.delete_remote_branch).pack(side=tk.LEFT, padx=5)


        # --- 状态框架控件 ---
        status_frame = ttk.LabelFrame(main_frame, text="状态", padding="10")
        status_frame.grid(row=0, column=0, sticky="nsew", padx=(0, 5))
        status_frame.rowconfigure(1, weight=1) # 未暂存列表行
        status_frame.rowconfigure(4, weight=1) # 已暂存列表行
        status_frame.columnconfigure(0, weight=1) # 列表列

        ttk.Label(status_frame, text="未暂存的更改 (Untracked / Modified):").grid(row=0, column=0, columnspan=2, sticky="w", pady=(0,2))
        unstaged_list_frame = ttk.Frame(status_frame)
        unstaged_list_frame.grid(row=1, column=0, columnspan=2, sticky="nsew", pady=(0, 5))
        unstaged_list_frame.rowconfigure(0, weight=1); unstaged_list_frame.columnconfigure(0, weight=1)
        self.unstaged_list = tk.Listbox(unstaged_list_frame, selectmode=tk.EXTENDED, height=8)
        self.unstaged_list.grid(row=0, column=0, sticky="nsew")
        unstaged_scroll = ttk.Scrollbar(unstaged_list_frame, orient=tk.VERTICAL, command=self.unstaged_list.yview)
        unstaged_scroll.grid(row=0, column=1, sticky="ns")
        self.unstaged_list['yscrollcommand'] = unstaged_scroll.set

        unstaged_buttons = ttk.Frame(status_frame)
        unstaged_buttons.grid(row=2, column=0, columnspan=2, sticky="ew", pady=(0, 10))
        ttk.Button(unstaged_buttons, text="暂存选中项", command=self.stage_selected).pack(side=tk.LEFT, expand=True, fill=tk.X, padx=2)
        ttk.Button(unstaged_buttons, text="暂存所有更改", command=self.stage_all).pack(side=tk.LEFT, expand=True, fill=tk.X, padx=2)

        ttk.Label(status_frame, text="已暂存的更改 (Staged):").grid(row=3, column=0, columnspan=2, sticky="w", pady=(5,2))
        staged_list_frame = ttk.Frame(status_frame)
        staged_list_frame.grid(row=4, column=0, columnspan=2, sticky="nsew", pady=(0, 5))
        staged_list_frame.rowconfigure(0, weight=1); staged_list_frame.columnconfigure(0, weight=1)
        self.staged_list = tk.Listbox(staged_list_frame, selectmode=tk.EXTENDED, height=8)
        self.staged_list.grid(row=0, column=0, sticky="nsew")
        staged_scroll = ttk.Scrollbar(staged_list_frame, orient=tk.VERTICAL, command=self.staged_list.yview)
        staged_scroll.grid(row=0, column=1, sticky="ns")
        self.staged_list['yscrollcommand'] = staged_scroll.set

        staged_buttons = ttk.Frame(status_frame)
        staged_buttons.grid(row=5, column=0, columnspan=2, sticky="ew")
        ttk.Button(staged_buttons, text="取消暂存选中项", command=self.unstage_selected).pack(side=tk.LEFT, expand=True, fill=tk.X, padx=2)

        ttk.Button(status_frame, text="刷新状态", command=self.refresh_status).grid(row=6, column=0, columnspan=2, sticky="ew", pady=(15,0))


        # --- 操作框架控件 ---
        commit_frame = ttk.LabelFrame(main_frame, text="操作", padding="10")
        commit_frame.grid(row=0, column=1, sticky="nsew", padx=(5, 0))
        commit_frame.columnconfigure(0, weight=1)

        ttk.Label(commit_frame, text="提交信息:").pack(anchor=tk.W, pady=(0, 5))
        self.commit_message = scrolledtext.ScrolledText(commit_frame, height=6, wrap=tk.WORD)
        self.commit_message.pack(fill=tk.BOTH, expand=True, pady=(0, 10))
        ttk.Button(commit_frame, text="提交 (Commit)", command=self.commit).pack(fill=tk.X, pady=5)
        ttk.Button(commit_frame, text="拉取 (Pull)", command=self.pull).pack(fill=tk.X, pady=5)

        # 推送按钮框架
        push_frame = ttk.Frame(commit_frame)
        push_frame.pack(fill=tk.X, pady=5)

        # 添加远程仓库管理按钮
        remote_frame = ttk.LabelFrame(commit_frame, text="远程仓库管理")
        remote_frame.pack(fill=tk.X, pady=10, padx=0)

        # 远程仓库下拉列表
        remote_list_frame = ttk.Frame(remote_frame)
        remote_list_frame.pack(fill=tk.X, pady=5)
        ttk.Label(remote_list_frame, text="远程仓库:").pack(side=tk.LEFT, padx=(0, 5))
        self.remote_combobox = ttk.Combobox(remote_list_frame, state="readonly")
        self.remote_combobox.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 5))
        ttk.Button(remote_list_frame, text="刷新", command=self.refresh_remotes).pack(side=tk.LEFT)

        # 远程仓库操作按钮
        remote_buttons_frame = ttk.Frame(remote_frame)
        remote_buttons_frame.pack(fill=tk.X, pady=5)
        ttk.Button(remote_buttons_frame, text="添加远程仓库", command=self.show_add_remote_dialog).pack(side=tk.LEFT, fill=tk.X, expand=True, padx=2)
        ttk.Button(remote_buttons_frame, text="删除远程仓库", command=self.show_remove_remote_dialog).pack(side=tk.LEFT, fill=tk.X, expand=True, padx=2)

        # 推送按钮
        push_buttons_frame = ttk.Frame(commit_frame)
        push_buttons_frame.pack(fill=tk.X, pady=5)
        ttk.Button(push_buttons_frame, text="推送到默认 (origin)", command=lambda: self.push()).pack(side=tk.LEFT, fill=tk.X, expand=True, padx=2)
        ttk.Button(push_buttons_frame, text="推送到选中远程", command=self.push_to_selected).pack(side=tk.LEFT, fill=tk.X, expand=True, padx=2)
        ttk.Button(push_buttons_frame, text="推送到所有远程", command=self.push_to_all).pack(side=tk.LEFT, fill=tk.X, expand=True, padx=2)


        # --- 输出框架控件 ---
        self.output_text = scrolledtext.ScrolledText(output_frame, height=8, wrap=tk.WORD, state=tk.DISABLED, font=("Consolas", 9))
        self.output_text.grid(row=0, column=0, sticky="nsew")
        output_scroll = ttk.Scrollbar(output_frame, orient=tk.VERTICAL, command=self.output_text.yview)
        output_scroll.grid(row=0, column=1, sticky="ns")
        self.output_text['yscrollcommand'] = output_scroll.set


        # --- 初始化 ---
        self.display_output("欢迎使用简易 Git GUI！\n请确保此脚本在 Git 仓库根目录下运行，或使用“选择仓库目录”按钮指定。\n")

        # 设置Git配置，使其正确显示中文文件名
        if self.is_git_repo(self.repo_path):
            self.run_git_command(['git', 'config', 'core.quotepath', 'false'])

        self.update_repository_display() # 更新显示并尝试加载信息
        self.refresh_remotes() # 初始化远程仓库列表

    # --- 方法 ---

    def run_git_command(self, command_list):
        """安全地运行 Git 命令并返回输出和错误 (使用 self.repo_path)"""
        if not self.repo_path or not os.path.exists(self.repo_path):
             err_msg = f"错误：仓库路径 '{self.repo_path}' 无效或不存在。"
             self.display_output(err_msg + "\n")
             messagebox.showerror("路径错误", err_msg)
             return None, err_msg, -1

        self.display_output(f"在 '{os.path.basename(self.repo_path)}' 运行: git {' '.join(shlex.quote(arg) for arg in command_list[1:])}\n", clear_previous=False)
        try:
            process = subprocess.run(
                command_list, capture_output=True, text=True,
                encoding='utf-8', errors='replace',
                cwd=self.repo_path,
                check=False,
                env={**os.environ.copy(), 'GIT_EDITOR': 'true'}
            )
            output_msg = f"命令: git {' '.join(shlex.quote(arg) for arg in command_list[1:])}\n"
            stdout_clean = "\n".join(line for line in process.stdout.splitlines() if line.strip())
            stderr_clean = "\n".join(line for line in process.stderr.splitlines() if line.strip())

            if stdout_clean: output_msg += f"输出:\n{stdout_clean}\n"
            # 改进 stderr 处理逻辑：只在退出码非0时标记为错误，否则为信息
            if stderr_clean:
                 level = "错误" if process.returncode != 0 else "信息"
                 output_msg += f"{level} (Stderr):\n{stderr_clean}\n"

            output_msg += f"退出码: {process.returncode}\n"
            self.display_output(output_msg)
            return process.stdout, process.stderr, process.returncode

        except FileNotFoundError:
            err_msg = "错误: 'git' 命令未找到。请确保 Git 已安装并且在其系统的 PATH 环境变量中。"
            self.display_output(err_msg + "\n"); messagebox.showerror("Git 未找到", err_msg)
            return None, err_msg, -1
        except Exception as e:
            err_msg = f"运行命令时发生未知错误: {e}"; self.display_output(err_msg + "\n")
            messagebox.showerror("未知错误", err_msg); return None, str(e), -1

    def display_output(self, text, clear_previous=False):
        """在输出区域显示文本"""
        self.output_text.config(state=tk.NORMAL)
        if clear_previous: self.output_text.delete("1.0", tk.END)
        self.output_text.insert(tk.END, text + "---\n")
        self.output_text.see(tk.END)
        self.output_text.config(state=tk.DISABLED)
        self.root.update_idletasks()

    def is_git_repo(self, path):
        """检查指定路径是否为 Git 仓库的根目录"""
        if not path or not os.path.isdir(path): return False
        return os.path.exists(os.path.join(path, '.git'))

    def refresh_status(self):
        """(已修复 Bug) 刷新状态列表"""
        if not self.is_git_repo(self.repo_path):
             self.unstaged_list.delete(0, tk.END); self.staged_list.delete(0, tk.END)
             return

        self.unstaged_list.delete(0, tk.END); self.staged_list.delete(0, tk.END)
        stdout, stderr, returncode = self.run_git_command(['git', 'status', '--porcelain=v1'])
        if returncode != 0:
            self.display_output("获取状态失败。\n")
            return

        lines = stdout.strip().split('\n') if stdout else []
        if not lines or (len(lines) == 1 and not lines[0]):
            self.display_output("工作区干净，没有变更。\n", clear_previous=True)
            return

        self.display_output("状态已刷新。\n", clear_previous=True)
        for line in lines:
            if not line: continue
            status_code = line[:2]
            filepath = line[3:].strip()
            # 处理路径解析 (带引号、转义、重命名)
            if filepath.startswith('"') and filepath.endswith('"'):
                 # 去掉引号
                 filepath = filepath[1:-1]

            # 处理Git的路径转义
            # 处理 \xxx 形式的八进制转义序列（常见于中文路径）
            if '\\' in filepath:
                try:
                    # 先尝试直接解码
                    decoded = filepath.encode('utf-8').decode('unicode_escape')
                    if not '\\' in decoded:  # 如果解码成功（不再包含反斜杠）
                        filepath = decoded
                    else:
                        # 处理形如 \346\226\260\345\273\272\346\226\207\344\273\266\345\244\271 的路径
                        # 这是UTF-8编码的八进制表示
                        octal_pattern = r'\\([0-7]{3})'
                        import re

                        # 将所有八进制转义序列转换为对应的字节
                        def replace_octal(match):
                            return bytes([int(match.group(1), 8)]).decode('latin-1')

                        # 先将八进制转义序列转换为字节序列
                        byte_str = re.sub(octal_pattern, replace_octal, filepath)

                        # 然后尝试将字节序列解码为UTF-8字符串
                        try:
                            filepath = byte_str.encode('latin-1').decode('utf-8')
                        except UnicodeDecodeError:
                            # 如果UTF-8解码失败，尝试其他编码
                            try:
                                filepath = byte_str.encode('latin-1').decode('gbk')
                            except UnicodeDecodeError:
                                # 如果所有尝试都失败，保留原始路径
                                pass
                except (UnicodeDecodeError, UnicodeEncodeError):
                    # 如果解码过程中出错，保留原始路径
                    pass

            if ' -> ' in filepath:
                filepath_parts = filepath.split(' -> ')
                new_path_raw = filepath_parts[-1]
                if new_path_raw.startswith('"') and new_path_raw.endswith('"'):
                     try:
                         filepath = new_path_raw[1:-1].encode('utf-8', 'surrogateescape').decode('utf-8')
                         if '\\' in filepath:
                             filepath = filepath.encode('latin-1', 'backslashreplace').decode('unicode_escape')
                     except UnicodeDecodeError:
                         filepath = new_path_raw[1:-1]
                else:
                    filepath = new_path_raw

            staged_char = status_code[0] # 保留空格 ' '
            unstaged_char = status_code[1] # 保留空格 ' '
            display_entry = f"{status_code} {filepath}" # 显示原始状态码

            # --- 修复后的逻辑 ---
            # 添加到“已暂存”列表 (Staged list)
            # 只有当第一个字符不是空格也不是 '?' 时才添加
            if staged_char != ' ' and staged_char != '?':
                self.staged_list.insert(tk.END, display_entry)

            # 添加到“未暂存”列表 (Unstaged list)
            # 只有当第二个字符不是空格，或者是 Untracked ('??') 时才添加
            if unstaged_char != ' ' or status_code == '??':
                 self.unstaged_list.insert(tk.END, display_entry)
            # --- 修复结束 ---

    def get_selected_files(self, listbox):
        """从列表框获取选中项并解析出文件路径"""
        selected_files = []
        selections = listbox.curselection()
        if not selections: return None # 没有选中项

        for i in selections:
            line = listbox.get(i)
            try:
                # 提取状态码后的文件路径
                filepath = line[3:].strip()
                # 进一步处理路径 (与 refresh_status 保持一致)
                if ' -> ' in filepath:
                    filepath_parts = filepath.split(' -> ')
                    new_path_raw = filepath_parts[-1]
                    if new_path_raw.startswith('"') and new_path_raw.endswith('"'):
                        filepath = new_path_raw[1:-1]
                    else:
                        filepath = new_path_raw
                elif filepath.startswith('"') and filepath.endswith('"'):
                    filepath = filepath[1:-1]

                # 处理Git的路径转义
                # 处理 \xxx 形式的八进制转义序列（常见于中文路径）
                if '\\' in filepath:
                    try:
                        # 先尝试直接解码
                        decoded = filepath.encode('utf-8').decode('unicode_escape')
                        if not '\\' in decoded:  # 如果解码成功（不再包含反斜杠）
                            filepath = decoded
                        else:
                            # 处理形如 \346\226\260\345\273\272\346\226\207\344\273\266\345\244\271 的路径
                            # 这是UTF-8编码的八进制表示
                            octal_pattern = r'\\([0-7]{3})'
                            import re

                            # 将所有八进制转义序列转换为对应的字节
                            def replace_octal(match):
                                return bytes([int(match.group(1), 8)]).decode('latin-1')

                            # 先将八进制转义序列转换为字节序列
                            byte_str = re.sub(octal_pattern, replace_octal, filepath)

                            # 然后尝试将字节序列解码为UTF-8字符串
                            try:
                                filepath = byte_str.encode('latin-1').decode('utf-8')
                            except UnicodeDecodeError:
                                # 如果UTF-8解码失败，尝试其他编码
                                try:
                                    filepath = byte_str.encode('latin-1').decode('gbk')
                                except UnicodeDecodeError:
                                    # 如果所有尝试都失败，保留原始路径
                                    pass
                    except (UnicodeDecodeError, UnicodeEncodeError):
                        # 如果解码过程中出错，保留原始路径
                        pass

                selected_files.append(filepath)
            except IndexError:
                self.display_output(f"错误：无法解析列表行: {line}\n")
        return selected_files


    def stage_selected(self):
        """暂存选中的未暂存文件"""
        if not self.is_git_repo(self.repo_path): return
        files_to_stage = self.get_selected_files(self.unstaged_list)
        if files_to_stage is None: messagebox.showinfo("提示", "请先在“未暂存的更改”列表中选择文件。"); return
        if not files_to_stage: self.display_output("未能识别选中的文件。\n"); return
        for filepath in files_to_stage:
            self.run_git_command(['git', 'add', '--', filepath])
        self.refresh_status()

    def stage_all(self):
        """暂存所有更改 (git add .)"""
        if not self.is_git_repo(self.repo_path): return
        self.run_git_command(['git', 'add', '.']); self.refresh_status()

    def unstage_selected(self):
        """取消暂存选中的已暂存文件"""
        if not self.is_git_repo(self.repo_path): return
        files_to_unstage = self.get_selected_files(self.staged_list)
        if files_to_unstage is None: messagebox.showinfo("提示", "请先在“已暂存的更改”列表中选择文件。"); return
        if not files_to_unstage: self.display_output("未能识别选中的文件。\n"); return
        for filepath in files_to_unstage:
            self.run_git_command(['git', 'reset', 'HEAD', '--', filepath])
        self.refresh_status()

    def commit(self):
        """提交暂存的更改"""
        if not self.is_git_repo(self.repo_path): messagebox.showerror("错误", "不是有效的 Git 仓库，无法提交。"); return
        message = self.commit_message.get("1.0", tk.END).strip()
        if not message: messagebox.showwarning("警告", "提交信息不能为空！"); return
        # 检查是否有暂存更改
        stdout_status, _, returncode_status = self.run_git_command(['git', 'diff', '--cached', '--quiet'])
        if returncode_status == 0:
             messagebox.showinfo("提示", "没有已暂存的更改可供提交。\n请先使用 'git add' 添加更改。")
             self.refresh_status(); return
        # 执行提交
        stdout, stderr, returncode = self.run_git_command(['git', 'commit', '-m', message])
        if returncode == 0: self.commit_message.delete("1.0", tk.END)
        self.refresh_status()

    def push(self, remote=None):
        """推送本地提交到远程仓库

        Args:
            remote: 指定远程仓库名称，如果为None则推送到默认远程仓库
        """
        if not self.is_git_repo(self.repo_path):
            messagebox.showerror("错误", "不是有效的 Git 仓库，无法推送。")
            return

        if remote:
            self.display_output(f"正在尝试推送到 {remote}... \n提示：此脚本无法处理认证提示。\n", clear_previous=True)
            self.run_git_command(['git', 'push', remote])
        else:
            self.display_output("正在尝试推送到默认远程仓库... \n提示：此脚本无法处理认证提示。\n", clear_previous=True)
            self.run_git_command(['git', 'push'])

    def pull(self):
        """从远程仓库拉取更改"""
        if not self.is_git_repo(self.repo_path): messagebox.showerror("错误", "不是有效的 Git 仓库，无法拉取。"); return
        self.display_output("正在尝试拉取... \n提示：若有冲突需手动解决。\n", clear_previous=True)
        self.run_git_command(['git', 'pull'])
        # 拉取后刷新状态和分支信息
        self.refresh_status()
        self.update_branch_info()

    def update_repository_display(self):
        """更新仓库路径显示，并尝试加载仓库信息"""
        self.repo_path_label_var.set(f"当前仓库: {self.repo_path}")
        if self.is_git_repo(self.repo_path):
            self.update_branch_info()
            self.refresh_status()
            # TODO: Re-enable buttons if they were disabled
        else:
            # 清理信息并可能禁用按钮
            self.current_branch_label_var.set("N/A")
            self.branch_combobox['values'] = []; self.branch_combobox.set('')
            self.unstaged_list.delete(0, tk.END); self.staged_list.delete(0, tk.END)
            self.display_output(f"错误：目录 '{self.repo_path}' 不是有效的 Git 仓库。\n", clear_previous=True)
            # TODO: Disable buttons if needed


    def select_repository(self):
        """打开目录选择对话框让用户选择仓库"""
        new_path = filedialog.askdirectory(title="请选择 Git 仓库根目录", initialdir=self.repo_path)
        if new_path and os.path.normpath(new_path) != os.path.normpath(self.repo_path):
            if self.is_git_repo(new_path):
                self.repo_path = os.path.normpath(new_path)
                self.display_output(f"仓库已切换到: {self.repo_path}\n", clear_previous=True)
                self.update_repository_display()
            else:
                messagebox.showerror("错误", f"所选目录 '{new_path}' 不是一个有效的 Git 仓库。")
                self.display_output(f"错误：无法切换到 '{new_path}'，不是有效的 Git 仓库。\n")

    def fetch_remote(self):
        """执行 git fetch 获取远程更新"""
        if not self.is_git_repo(self.repo_path): messagebox.showerror("错误", "不是有效的 Git 仓库，无法抓取更新。"); return
        self.display_output("正在抓取远程更新 (git fetch origin --prune)...\n", clear_previous=True)
        stdout, stderr, returncode = self.run_git_command(['git', 'fetch', 'origin', '--prune'])
        if returncode == 0:
            self.display_output("抓取远程更新完成。\n")
            self.update_branch_info() # Fetch 后更新分支列表
        # else: Error already displayed

    def update_branch_info(self):
        """(已修复) 更新当前分支标签和分支下拉列表 (使用 git branch -a)"""
        if not self.is_git_repo(self.repo_path):
             self.current_branch_label_var.set("N/A"); self.branch_combobox['values'] = []; self.branch_combobox.set(''); return

        stdout, stderr, returncode = self.run_git_command(['git', 'branch', '-a', '--no-color'])
        if returncode != 0:
            self.current_branch_label_var.set("获取失败"); self.branch_combobox['values'] = []; self.branch_combobox.set(''); return

        branches = [b.strip() for b in stdout.split('\n') if b.strip()]
        current_branch_display = "未知"
        all_branches_set = set()
        local_branches = []

        for branch_line in branches:
            is_current = branch_line.startswith('*')
            branch_name_display = branch_line.replace('*','').strip()

            if 'HEAD detached at' in branch_name_display or ' -> ' in branch_name_display: continue

            if branch_name_display.startswith('remotes/'):
                 parts = branch_name_display.split('/', 2)
                 if len(parts) == 3:
                      # 显示为 "origin/branch_name"
                      display_name = f"{parts[1]}/{parts[2]}"
                      all_branches_set.add(display_name)
            else:
                local_branches.append(branch_name_display)
                all_branches_set.add(branch_name_display)

            if is_current:
                # 如果当前是 detached HEAD，current_branch_display 会是 '(HEAD detached at ...)'
                # 否则它就是本地分支名
                current_branch_display = branch_name_display

        # 更新当前分支显示标签
        self.current_branch_label_var.set(current_branch_display if current_branch_display != "未知" else local_branches[0] if local_branches else "无本地分支或Detached")

        # 排序：本地分支在前，然后按字母排序；远程分支在后，也按字母排序
        sorted_branches = sorted(list(all_branches_set), key=lambda x: (not x in local_branches, x))

        self.branch_combobox['values'] = sorted_branches
        if current_branch_display in sorted_branches:
            self.branch_combobox.set(current_branch_display)
        elif sorted_branches:
             self.branch_combobox.set(sorted_branches[0])
        else:
             self.branch_combobox.set('')


    def switch_branch(self):
        """(已修复) 切换到下拉列表中选定的分支 (处理远程分支名)"""
        if not self.is_git_repo(self.repo_path): messagebox.showerror("错误", "不是有效的 Git 仓库，无法切换分支。"); return

        target_branch_display = self.branch_combobox.get()
        if not target_branch_display: messagebox.showwarning("警告", "请先从下拉列表选择一个目标分支。"); return

        # 提取实际用于 checkout 的分支名
        actual_branch_name = target_branch_display
        # 检查是否是 'origin/branch' 格式
        if target_branch_display.count('/') >= 1:
             # 假设第一个 / 前是远程名 (更安全的做法是检查 'remotes/' 前缀，但 branch -a 输出不一定总有)
             parts = target_branch_display.split('/', 1)
             # 检查 parts[0] 是否是已知的远程名，这里简化为只要包含 / 就尝试取后面部分
             if len(parts) > 1:
                  # 检查本地是否已存在同名分支，如果存在则优先切换本地
                  stdout_local, _, _ = self.run_git_command(['git', 'branch', '--list', parts[1]])
                  if not stdout_local or not parts[1] in [b.strip().replace('* ','') for b in stdout_local.splitlines()]:
                       # 本地不存在同名分支，目标可能是远程分支
                       actual_branch_name = parts[1]
                  else:
                      # 本地存在同名分支，直接用显示名（也就是本地名）切换
                      actual_branch_name = target_branch_display


        current_branch_name = self.current_branch_label_var.get()
        if target_branch_display == current_branch_name:
             messagebox.showinfo("提示", f"你当前已经在 '{current_branch_name}' 分支了。"); return

        # 检查未提交更改
        _, _, wc_dirty = self.run_git_command(['git', 'diff', '--quiet'])
        _, _, idx_dirty = self.run_git_command(['git', 'diff', '--cached', '--quiet'])
        if wc_dirty != 0 or idx_dirty != 0:
             proceed = messagebox.askyesno("警告：存在未提交的更改",
                                           "检测到未提交的更改。\n切换分支可能会丢失工作区修改或失败。\n\n是否仍然尝试切换？（建议先提交或储藏更改）")
             if not proceed: return

        # 执行切换
        self.display_output(f"尝试切换到 '{actual_branch_name}' (从选择 '{target_branch_display}')...\n")
        stdout, stderr, returncode = self.run_git_command(['git', 'checkout', actual_branch_name])

        # 切换后更新信息
        self.update_branch_info()
        self.refresh_status()

    def create_and_switch_branch(self):
        """创建新分支并切换过去"""
        if not self.is_git_repo(self.repo_path): messagebox.showerror("错误", "不是有效的 Git 仓库，无法创建分支。"); return

        new_branch_name = self.new_branch_entry.get().strip()
        if not new_branch_name: messagebox.showwarning("警告", "新分支名称不能为空！"); return

        # 基本验证
        if re.search(r'\s|~|\^|:|\\|\.\.|\*|\?|\[|@\{', new_branch_name) or \
           new_branch_name.startswith('/') or new_branch_name.endswith('/'):
            messagebox.showwarning("警告", "分支名称包含空格或无效字符 (~\^:\\..*?[]@{}) 或格式错误")
            return

        # 检查分支是否已存在
        stdout_b, _, retcode_b = self.run_git_command(['git', 'branch', '-a', '--no-color'])
        if retcode_b != 0: return
        existing_branch_names = set()
        if stdout_b:
             lines = stdout_b.strip().split('\n')
             for line in lines:
                  branch_name_raw = line.replace('*','').strip()
                  if ' -> ' in branch_name_raw or 'HEAD detached' in branch_name_raw: continue
                  # 提取实际分支名 (本地和远程的都要)
                  actual_name = branch_name_raw.split('/')[-1]
                  existing_branch_names.add(actual_name)
                  # 同时检查完整的远程名 (origin/xyz)
                  if branch_name_raw.startswith('remotes/'):
                       parts = branch_name_raw.split('/', 2)
                       if len(parts) == 3: existing_branch_names.add(f"{parts[1]}/{parts[2]}")
                  # 检查本地名
                  if not branch_name_raw.startswith('remotes/'):
                      existing_branch_names.add(branch_name_raw)


        if new_branch_name in existing_branch_names:
             messagebox.showerror("错误", f"名为 '{new_branch_name}' 的分支已经存在 (本地或远程)！")
             return

        # 执行创建并切换
        self.display_output(f"尝试创建并切换到新分支: {new_branch_name}\n")
        stdout_c, stderr_c, returncode_c = self.run_git_command(['git', 'checkout', '-b', new_branch_name])
        if returncode_c == 0:
            self.display_output(f"成功创建并切换到新分支: {new_branch_name}\n")
            self.new_branch_entry.delete(0, tk.END)
            self.update_branch_info()
            self.refresh_status()

    def delete_local_branch(self, force=False):
        """删除下拉列表中选中的本地分支"""
        if not self.is_git_repo(self.repo_path): messagebox.showerror("错误", "不是有效的 Git 仓库。"); return

        branch_to_delete_display = self.branch_combobox.get()
        if not branch_to_delete_display: messagebox.showwarning("警告", "请先从下拉列表选择一个要删除的分支。"); return

        # 检查选中的是否为本地分支 (简单判断：不包含 '/')
        is_local = '/' not in branch_to_delete_display
        if not is_local:
             messagebox.showerror("错误", f"'{branch_to_delete_display}' 看起来像一个远程分支引用。\n请选择一个本地分支进行删除。")
             return

        current_branch_name = self.current_branch_label_var.get()
        if branch_to_delete_display == current_branch_name:
            messagebox.showerror("错误", "不能删除当前所在的分支！\n请先切换到其他分支。")
            return

        # 确认操作
        force_flag = "-D" if force else "-d"
        action_desc = "强制删除本地" if force else "删除本地"
        confirm_msg = f"你确定要 {action_desc} 分支 '{branch_to_delete_display}' 吗？\n"
        if not force: confirm_msg += "(如果分支有未合并的更改，删除可能会失败)"
        else: confirm_msg += "(注意：强制删除会丢失未合并的更改！)"

        if messagebox.askyesno("确认删除本地分支", confirm_msg):
            self.display_output(f"尝试 {action_desc} 分支: {branch_to_delete_display}...\n")
            stdout, stderr, returncode = self.run_git_command(['git', 'branch', force_flag, branch_to_delete_display])
            if returncode == 0:
                self.display_output(f"成功 {action_desc} 分支 '{branch_to_delete_display}'。\n")
            self.update_branch_info() # 删除后刷新列表


    def delete_remote_branch(self):
        """删除下拉列表中选中的远程分支 (在 origin 上)"""
        if not self.is_git_repo(self.repo_path): messagebox.showerror("错误", "不是有效的 Git 仓库。"); return

        branch_to_delete_display = self.branch_combobox.get() # 可能包含 origin/
        if not branch_to_delete_display: messagebox.showwarning("警告", "请先从下拉列表选择一个要删除的分支。"); return

        # 提取实际的分支名称 (去掉 'origin/' 等前缀)
        actual_branch_name = branch_to_delete_display
        remote_name = 'origin' # 默认远程名为 origin
        if '/' in branch_to_delete_display:
             parts = branch_to_delete_display.split('/', 1)
             if len(parts) > 1 and parts[0] != '': # 假设是 remote/branch 格式
                  remote_name = parts[0] # 获取远程仓库名
                  actual_branch_name = parts[1]

        # 再次确认选中的是远程分支 (或者本地也有同名分支？这里需要更清晰的逻辑，暂时只按名字删)

        # 危险操作警告
        if actual_branch_name in ['main', 'master', 'dev', 'develop', 'release']: # 增加常见保护分支
            if not messagebox.askyesno("高风险操作警告", f"你选择删除的是可能是受保护的分支 ('{actual_branch_name}')！\n这通常非常危险，会影响所有协作者。\n\n你**极其确定**要删除远程分支 '{remote_name}/{actual_branch_name}' 吗？"):
                return
        elif not messagebox.askyesno("确认删除远程分支", f"你确定要删除远程仓库 '{remote_name}' 上的分支 '{actual_branch_name}' 吗？\n此操作会影响所有协作者，且可能难以恢复！"):
            return

        # 执行删除远程分支命令
        self.display_output(f"尝试删除远程 '{remote_name}' 上的分支: {actual_branch_name}...\n提示：需要推送权限，且无法处理认证提示。\n")
        stdout, stderr, returncode = self.run_git_command(['git', 'push', remote_name, '--delete', actual_branch_name])

        if returncode == 0 or "deleted" in (stderr or "").lower(): # 检查 stderr 中是否有成功删除的迹象
            self.display_output(f"删除远程分支 '{actual_branch_name}' 的命令已发送。\n请检查输出确认是否成功。\n")
            # 远程删除成功后，fetch prune 并更新列表
            self.fetch_remote() # Fetch 会调用 update_branch_info
        # else: 错误信息已显示

    def get_remote_repositories(self):
        """获取所有远程仓库列表"""
        if not self.is_git_repo(self.repo_path):
            return []

        stdout, stderr, returncode = self.run_git_command(['git', 'remote'])
        if returncode != 0 or not stdout:
            return []

        remotes = [remote.strip() for remote in stdout.split('\n') if remote.strip()]
        return remotes

    def refresh_remotes(self):
        """刷新远程仓库下拉列表"""
        remotes = self.get_remote_repositories()
        self.remote_combobox['values'] = remotes
        if remotes:
            self.remote_combobox.set(remotes[0])
        else:
            self.remote_combobox.set('')

    def push_to_selected(self):
        """推送到选中的远程仓库"""
        if not self.is_git_repo(self.repo_path):
            messagebox.showerror("错误", "不是有效的 Git 仓库，无法推送。")
            return

        selected_remote = self.remote_combobox.get()
        if not selected_remote:
            messagebox.showwarning("警告", "请先选择一个远程仓库。")
            return

        self.push(selected_remote)

    def push_to_all(self):
        """推送到所有远程仓库"""
        if not self.is_git_repo(self.repo_path):
            messagebox.showerror("错误", "不是有效的 Git 仓库，无法推送。")
            return

        remotes = self.get_remote_repositories()
        if not remotes:
            messagebox.showinfo("提示", "没有找到远程仓库。")
            return

        success_count = 0
        for remote in remotes:
            self.display_output(f"正在尝试推送到 {remote}...\n", clear_previous=(success_count==0))
            stdout, stderr, returncode = self.run_git_command(['git', 'push', remote])
            if returncode == 0:
                success_count += 1

        if success_count == len(remotes):
            self.display_output(f"成功推送到所有 {success_count} 个远程仓库。\n")
        else:
            self.display_output(f"推送完成，成功: {success_count}/{len(remotes)}。请检查输出了解详情。\n")

    def get_remote_url(self, remote_name):
        """获取指定远程仓库的URL"""
        if not self.is_git_repo(self.repo_path):
            return None

        stdout, stderr, returncode = self.run_git_command(['git', 'remote', 'get-url', remote_name])
        if returncode != 0 or not stdout:
            return None

        return stdout.strip()

    def add_remote(self, name, url):
        """添加新的远程仓库"""
        if not self.is_git_repo(self.repo_path):
            messagebox.showerror("错误", "不是有效的 Git 仓库，无法添加远程仓库。")
            return False

        stdout, stderr, returncode = self.run_git_command(['git', 'remote', 'add', name, url])
        if returncode != 0:
            messagebox.showerror("错误", f"添加远程仓库失败: {stderr}")
            return False

        self.display_output(f"成功添加远程仓库 '{name}': {url}\n")
        return True

    def remove_remote(self, name):
        """删除远程仓库"""
        if not self.is_git_repo(self.repo_path):
            messagebox.showerror("错误", "不是有效的 Git 仓库，无法删除远程仓库。")
            return False

        if name == 'origin':
            if not messagebox.askyesno("警告", "你正在尝试删除默认的'origin'远程仓库，这可能会影响正常的Git操作。确定要继续吗？"):
                return False

        stdout, stderr, returncode = self.run_git_command(['git', 'remote', 'remove', name])
        if returncode != 0:
            messagebox.showerror("错误", f"删除远程仓库失败: {stderr}")
            return False

        self.display_output(f"成功删除远程仓库 '{name}'\n")
        self.refresh_remotes()  # 刷新远程仓库列表
        return True

    def show_add_remote_dialog(self):
        """显示添加远程仓库对话框"""
        if not self.is_git_repo(self.repo_path):
            messagebox.showerror("错误", "不是有效的 Git 仓库，无法添加远程仓库。")
            return

        # 创建对话框
        dialog = tk.Toplevel(self.root)
        dialog.title("添加远程仓库")
        dialog.geometry("500x200")
        dialog.transient(self.root)  # 设置为主窗口的子窗口
        dialog.grab_set()  # 模态对话框

        # 添加控件
        ttk.Label(dialog, text="远程仓库名称:").grid(row=0, column=0, padx=10, pady=10, sticky="e")
        name_entry = ttk.Entry(dialog, width=30)
        name_entry.grid(row=0, column=1, padx=10, pady=10, sticky="ew")
        name_entry.insert(0, "gitcode")  # 默认名称

        ttk.Label(dialog, text="远程仓库URL:").grid(row=1, column=0, padx=10, pady=10, sticky="e")
        url_entry = ttk.Entry(dialog, width=50)
        url_entry.grid(row=1, column=1, padx=10, pady=10, sticky="ew")

        # 提示信息
        ttk.Label(dialog, text="例如: https://gitcode.com/username/repo.git",
                 font=("TkDefaultFont", 8)).grid(row=2, column=1, padx=10, sticky="w")

        # 按钮框架
        button_frame = ttk.Frame(dialog)
        button_frame.grid(row=3, column=0, columnspan=2, pady=20)

        # 确定按钮
        def on_confirm():
            name = name_entry.get().strip()
            url = url_entry.get().strip()

            if not name:
                messagebox.showwarning("警告", "远程仓库名称不能为空！", parent=dialog)
                return

            if not url:
                messagebox.showwarning("警告", "远程仓库URL不能为空！", parent=dialog)
                return

            if self.add_remote(name, url):
                dialog.destroy()
                self.refresh_remotes()

        ttk.Button(button_frame, text="确定", command=on_confirm).pack(side=tk.LEFT, padx=10)
        ttk.Button(button_frame, text="取消", command=dialog.destroy).pack(side=tk.LEFT, padx=10)

        # 设置列权重
        dialog.columnconfigure(1, weight=1)

        # 聚焦到名称输入框
        name_entry.focus_set()

    def show_remove_remote_dialog(self):
        """显示删除远程仓库对话框"""
        if not self.is_git_repo(self.repo_path):
            messagebox.showerror("错误", "不是有效的 Git 仓库，无法删除远程仓库。")
            return

        remotes = self.get_remote_repositories()
        if not remotes:
            messagebox.showinfo("提示", "没有找到远程仓库。")
            return

        selected_remote = self.remote_combobox.get()
        if not selected_remote:
            messagebox.showwarning("警告", "请先选择一个远程仓库。")
            return

        if messagebox.askyesno("确认删除", f"确定要删除远程仓库 '{selected_remote}' 吗？"):
            self.remove_remote(selected_remote)


# --- 主程序入口 ---
if __name__ == "__main__":
    # 尝试在 Windows 上设置 DPI 感知
    try:
        if platform.system() == "Windows":
            from ctypes import windll
            try: windll.shcore.SetProcessDpiAwareness(2)
            except Exception:
                try: windll.user32.SetProcessDPIAware()
                except Exception: pass
    except Exception: pass

    root = tk.Tk()
    app = SimpleGitApp(root)
    # 只有在窗口未被销毁时才运行 mainloop
    if root.winfo_exists():
        root.mainloop()