# Python 适配包

> 本文件是 Python(常见 Web 框架 + pytest 为主)的行业默认约定参考。

## 0. 如何使用 / 约定优先级

- 约定来源优先级遵循 `references/项目上下文指南.md` 第 3 节;本适配包只提供低于项目事实的行业默认规则。
- 本包列「常见选项」,不指定唯一答案;具体用哪个由当前项目事实和经校验的 `PROJECT-CONTEXT.md` 确认。
- 进入实施/验证前,若项目主栈为本栈,应加载并参考本文件。

---

## 1. 识别信号

- 构建 / 包管理:`pyproject.toml`、`requirements.txt` / `requirements-dev.txt`、`setup.py`、`Pipfile`、`poetry.lock`(Poetry)、`uv.lock`(uv);虚拟环境 `venv` / `.venv`。
- 依赖特征:`django`、`fastapi`、`flask`、`sqlalchemy`、`pandas`、`pytest`。
- 目录特征:`src/<pkg>` 或 `app/`、`tests/`;`manage.py`(Django)、`main.py` / `app.py`。

---

## 2. 构建与校验命令

| 用途 | 常见命令(用项目实际的) |
|---|---|
| 安装依赖 | `pip install -r requirements.txt` / `poetry install` / `uv sync` |
| 运行测试 | `pytest` / `python -m pytest` / `python manage.py test`(Django) |
| lint | `ruff check` / `flake8`;格式化 `ruff format` / `black` |
| 类型检查 | `mypy` / `pyright`(仅当项目启用) |
| 覆盖率 | `pytest --cov` / `coverage run -m pytest` |

---

## 3. 分层与命名

- 常见分层(Web):`routers`·`views`(路由/视图)/ `services`·`use_cases`(业务)/ `models`(数据模型)/ `repositories`·`dao`(持久化)/ `schemas`(Pydantic)/ `tasks`(异步)/ `utils`·`common`。
- 命名约定:模块/文件、函数/变量 `snake_case`;类 `PascalCase`;常量 `UPPER_SNAKE`。
- 文件后缀:`.py`。

> Django / FastAPI / Flask 差异大,以 `PROJECT-CONTEXT.md` 记录的实际分层为准。

---

## 4. 测试

- 框架:pytest(首选)或 unittest。
- Mock:`unittest.mock`(`patch` / `MagicMock`)/ `pytest-mock` 的 `mocker`。
- Web 测试:FastAPI `TestClient`、Django `TestCase` / `Client`、Flask `test_client`。
- Fixture:`conftest.py` + `@pytest.fixture`。
- 目录:`tests/`,文件 `test_*.py`,函数 `test_xxx`。
- 覆盖率:`pytest-cov`。

---

## 5. 数据或状态访问

- ORM / 数据访问:Django ORM、SQLAlchemy、SQLModel、Tortoise;或原生数据库驱动。
- 迁移:Django migrations / Alembic(SQLAlchemy)。
- 配置:从环境变量 / `.env`(pydantic-settings / python-dotenv)读取,不硬编码。

---

## 6. 典型红线与陷阱

- **类型注解**:项目启用 mypy / pyright 时补全注解;不强制无类型检查的项目。
- **虚拟环境**:依赖装在虚拟环境,`requirements.txt` / `pyproject.toml` 与锁文件保持一致;`.venv` 不入库。
- **注入**:SQL 拼接防注入(用参数化查询 / ORM);`eval` / `shell` 执行用户输入危险。
- **可变默认参数**:`def f(x=[])` 共享可变默认值陷阱,改用 `x=None`。
- **密钥**:密钥 / Token 从环境读,禁止硬编码入库。
- **异步**:`async` / `await` 与同步混用易阻塞事件循环;注意框架 asyncio / trio。

---

## 7. 一句话总结

以 pytest + 类型注解 + 虚拟环境为基线,分层聚焦路由/服务/模型/持久化,严守注入、可变默认参数、密钥与异步红线。
