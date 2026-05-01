# UV_Quickstart

#### 1:安装

```latex
$ curl -LsSf https://astral.sh/uv/install.sh | sh
# 查看安装情况
$ uv --version
uv 0.9.18
$ which uv
/path/to/.local/bin/uv
```

#### 2:配置源

```latex
# python mirror
export UV_PYTHON_INSTALL_MIRROR="https://gh-proxy.com/https://github.com/astral-sh/python-build-standalone/releases/download"

# pip mirror
export UV_DEFAULT_INDEX="https://pypi.tuna.tsinghua.edu.cn/simple"
```

#### 3:项目管理

```latex
# 如果你之前使用了conda来管理虚拟需要将环境变量中的conda的环境变量进行注释

# >>> conda initialize >>>
# !! Contents within this block are managed by 'conda init' !!
#__conda_setup="$('/path/to/anaconda3/bin/conda' 'shell.bash' 'hook' 2> /dev/null)"
#if [ $? -eq 0 ]; then
#    eval "$__conda_setup"
#else
#    if [ -f "/path/to/anaconda3/etc/profile.d/conda.sh" ]; then
#        . "/path/to/anaconda3/etc/profile.d/conda.sh"
#    else
#        export PATH="/path/to/anaconda3/bin:$PATH"
#    fi
#fi
#unset __conda_setup
# <<< conda initialize <<<

# source ~/.bashrc

$ which python3
/usr/bin/python3
$ python3
Python 3.12.3 (main, Nov  6 2025, 13:44:16) [GCC 13.3.0] on linux
Type "help", "copyright", "credits" or "license" for more information.
>>> 
```

##### 多Python 版本

uv 可以管理多个 Python 版本，查看可用的 Python 版本：

```latex
$ uv python list
cpython-3.15.0a2-linux-x86_64-gnu                 <download available>
cpython-3.15.0a2+freethreaded-linux-x86_64-gnu    <download available>
cpython-3.14.2-linux-x86_64-gnu                   <download available>
cpython-3.14.2+freethreaded-linux-x86_64-gnu      <download available>
cpython-3.13.11-linux-x86_64-gnu                  .local/bin/python3.13 -> .local/share/uv/python/cpython-3.13.11-linux-x86_64-gnu/bin/python3.13
cpython-3.13.11-linux-x86_64-gnu                  .local/share/uv/python/cpython-3.13.11-linux-x86_64-gnu/bin/python3.13
cpython-3.13.11+freethreaded-linux-x86_64-gnu     <download available>
cpython-3.12.12-linux-x86_64-gnu                  .local/bin/python3.12 -> .local/share/uv/python/cpython-3.12.12-linux-x86_64-gnu/bin/python3.12
cpython-3.12.12-linux-x86_64-gnu                  .local/share/uv/python/cpython-3.12.12-linux-x86_64-gnu/bin/python3.12
cpython-3.12.3-linux-x86_64-gnu                   /usr/bin/python3.12
cpython-3.12.3-linux-x86_64-gnu                   /usr/bin/python3 -> python3.12
......

# 安装python3.14最新版本
uv python install 3.14

# 安装特定版本3.10.8
uv python install 3.10.8

$ uv python list --only-installed
cpython-3.14.2-linux-x86_64-gnu     .local/bin/python3.14 -> .local/share/uv/python/cpython-3.14.2-linux-x86_64-gnu/bin/python3.14
cpython-3.14.2-linux-x86_64-gnu     .local/share/uv/python/cpython-3.14.2-linux-x86_64-gnu/bin/python3.14
cpython-3.13.11-linux-x86_64-gnu    .local/bin/python3.13 -> .local/share/uv/python/cpython-3.13.11-linux-x86_64-gnu/bin/python3.13
cpython-3.13.11-linux-x86_64-gnu    .local/share/uv/python/cpython-3.13.11-linux-x86_64-gnu/bin/python3.13
cpython-3.12.12-linux-x86_64-gnu    .local/bin/python3.12 -> .local/share/uv/python/cpython-3.12.12-linux-x86_64-gnu/bin/python3.12
cpython-3.12.12-linux-x86_64-gnu    .local/share/uv/python/cpython-3.12.12-linux-x86_64-gnu/bin/python3.12
cpython-3.12.3-linux-x86_64-gnu     /usr/bin/python3.12
cpython-3.12.3-linux-x86_64-gnu     /usr/bin/python3 -> python3.12
cpython-3.10.8-linux-x86_64-gnu     .local/bin/python3.10 -> .local/share/uv/python/cpython-3.10.8-linux-x86_64-gnu/bin/python3.10
cpython-3.10.8-linux-x86_64-gnu     .local/share/uv/python/cpython-3.10.8-linux-x86_64-gnu/bin/python3.10
```



##### uv init

创建一个新项目，且遵循 `pyproject.toml` 规范

```latex
$ uv init
Initialized project `smart-call`
$ ls -al
总计 28
drwxrwxr-x  3 lz lz 4096 12月 27 00:21 .
drwxrwxr-x 13 lz lz 4096 12月 27 00:00 ..
drwxrwxr-x  7 lz lz 4096 12月 27 00:21 .git
-rw-rw-r--  1 lz lz  109 12月 27 00:21 .gitignore
-rw-rw-r--  1 lz lz   88 12月 27 00:21 main.py
-rw-rw-r--  1 lz lz  156 12月 27 00:21 pyproject.toml
-rw-rw-r--  1 lz lz    5 12月 27 00:21 .python-version
-rw-rw-r--  1 lz lz    0 12月 27 00:21 README.md
$ cat pyproject.toml 
[project]
name = "smart-call"
version = "0.1.0"
description = "Add your description here"
readme = "README.md"
requires-python = ">=3.14" # uv 默认的python版本
dependencies = []

# 也可以在创建的时候指定python的版本 
$ uv init demo1 --python 3.10.8
Initialized project `demo1` at `/path/to/your/apps/demo1`
$ cat demo1/pyproject.toml 
[project]
name = "demo1"
version = "0.1.0"
description = "Add your description here"
readme = "README.md"
requires-python = ">=3.10.8" # 我们指定的python版本
dependencies = []


$ uv venv # 创建虚拟环境,uv 默认的python版本
Using CPython 3.14.2
Creating virtual environment at: .venv
Activate with: source .venv/bin/activate
$ source .venv/bin/activate # 启动虚拟环境
(smart_call) $ deactivate # 退出虚拟环境

# 我们在uv init的时候指定版本后 uv venv也是会按照我们init的版本
lz@lz:~/repo/apps/demo1$ uv venv
Using CPython 3.10.8
Creating virtual environment at: .venv
Activate with: source .venv/bin/activate

# 当然我们也可以重新切换一个版本
uv venv --python 3.12 --clear # 重新设置python版本，并删除目前的.venv 
！！！注意--clear只会删除和重建虚拟环境，而不会自动更新这些文件(.python-version,pyproject.toml)中的内容,所以最好确定好版本
(demo1) $ python3
Python 3.12.12 (main, Dec  9 2025, 19:02:36) [Clang 21.1.4 ] on linux
Type "help", "copyright", "credits" or "license" for more information.
>>> exit()
(demo1) $ cat .python-version 
3.10.8
```

##### 创建项目

```latex
# 假设我们此处需要创建一个简单的fastapi的应用,python 版本是3.10.8
uv init --python 3.10.8 fastapi_demo

uv venv
# 我们需要安装fastapi,uvcorn...
(fastapi_demo) lz@lz:~/repo/apps/fastapi_demo$ uv pip list
(fastapi_demo) lz@lz:~/repo/apps/fastapi_demo$ uv add fastapi uvicorn # uv pip install fastapi uvicorn
Resolved 12 packages in 927ms
Prepared 2 packages in 938ms
Installed 11 packages in 5ms
 + annotated-doc==0.0.4
 + annotated-types==0.7.0
 + anyio==4.12.0
 + exceptiongroup==1.3.1
 + fastapi==0.127.1
 + idna==3.11
 + pydantic==2.12.5
 + pydantic-core==2.41.5
 + starlette==0.50.0
 + typing-extensions==4.15.0
 + typing-inspection==0.4.2
(fastapi_demo) lz@lz:~/repo/apps/fastapi_demo$ uv pip list
Package           Version
----------------- -------
annotated-doc     0.0.4
annotated-types   0.7.0
anyio             4.12.0
exceptiongroup    1.3.1
fastapi           0.127.1
idna              3.11
pydantic          2.12.5
pydantic-core     2.41.5
starlette         0.50.0
typing-extensions 4.15.0
typing-inspection 0.4.2

# 测试代码 main.py
from fastapi import FastAPI
app = FastAPI()

@app.get("/")
def get():
    return "hello,world!"


if __name__=="__main__":
    import uvicorn
    uvicorn.run("main:app",host="127.0.0.1",port=9099)


(fastapi_demo) $ uv run ./main.py # 或者 python main.py
INFO:     Started server process [80869]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://127.0.0.1:9099 (Press CTRL+C to quit)

(fastapi_demo) $ curl -X 'GET' \
  'http://127.0.0.1:9099/' \
  -H 'accept: application/json'
"hello,world!"


```

##### 部署项目

以vllm-cpu为例https://docs.vllm.ai/en/latest/getting_started/installation/cpu/#intelamd-x86

###### Pre-built wheels

```latex
uv venv --python 3.12 --seed # --seed：在创建虚拟环境时自动安装常见的基础工具包
source .venv/bin/activate

export VLLM_VERSION=$(curl -s https://api.github.com/repos/vllm-project/vllm/releases/latest | jq -r .tag_name | sed 's/^v//')

uv pip install https://github.com/vllm-project/vllm/releases/download/v${VLLM_VERSION}/vllm-${VLLM_VERSION}+cpu-cp38-abi3-manylinux_2_35_x86_64.whl --torch-backend cpu

(ptw) $ uv pip list | grep vllm
vllm                              0.13.0+cpu
(ptw) $ python
Python 3.12.12 (main, Dec  9 2025, 19:02:36) [Clang 21.1.4 ] on linux
Type "help", "copyright", "credits" or "license" for more information.
>>> import vllm
>>> print(vllm.__version__)
0.13.0
```



###### Build from source

```latex
sudo apt-get update -y
sudo apt-get install -y gcc-12 g++-12 libnuma-dev
sudo update-alternatives --install /usr/bin/gcc gcc /usr/bin/gcc-12 10 --slave /usr/bin/g++ g++ /usr/bin/g++-12

uv venv --python 3.12 --seed
source .venv/bin/activate

git clone https://github.com/vllm-project/vllm.git vllm_source
cd vllm_source

(bfs) $ VLLM_TARGET_DEVICE=cpu uv pip install . --no-build-isolation
Using Python 3.12.12 environment at: /home/lz/repo/apps/bfs/.venv
Resolved 136 packages in 2.18s
      Built vllm @ file:///home/lz/repo/apps/bfs/vllm_source
Prepared 1 package in 21.21s
Installed 1 package in 30ms
 + vllm==0.14.0rc1.dev139+g887e900b7.cpu (from file:///home/lz/repo/apps/bfs/vllm_source)
```

#### 4:注意点

```latex
# uv默认安装的是GPU版本的torch，需要指定--torch-backend=cpu
uv pip install torch==2.6.0 torchvision==0.21.0 torchaudio==2.6.0 --index-url https://download.pytorch.org/whl/cpu --torch-backend=cpu


```





#### 5:总结

```latex
更多应用细节可以参考UV官网示例，例如多环境路径的配置、指定环境名称、修改默认Python版本,uv sync等操作。具体细节请参见UV官方文档。这些操作虽然对项目的环境管理很重要，但并不需要花费过多时间去理解每一个参数的使用。最重要的是，建议每个项目使用单独的环境和依赖管理，确保项目的隔离性和可维护性。理解环境配置的细节，最好是通过实践，一边使用一边学习。毕竟，配置环境只是编写代码过程中最基础且必要的步骤之一，掌握这一点对后续的开发和维护大有裨益。
关于应用发布，UV对发布到PyPI的包和lib库都有相应的支持结构。详细的创建项目和发布流程，可以参考UV文档中关于创建项目
的部分。通过UV，开发者可以更方便地管理项目的依赖和发布流程，减少了手动处理包和版本控制的复杂性，尤其是对于持续集成（CI）和持续交付（CD）的场景来说，UV提供了很好的支持。
```

#### 6：参考

1:[UV](https://docs.astral.sh/uv)

2:[vllm](https://docs.vllm.ai/en/latest/getting_started/installation/cpu/)















