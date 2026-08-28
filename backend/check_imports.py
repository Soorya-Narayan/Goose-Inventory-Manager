try:
    import langchain
    print(f"langchain version: {langchain.__version__}")
except ImportError:
    print("langchain not found")

try:
    from langchain.text_splitter import RecursiveCharacterTextSplitter
    print("Import 1 success: langchain.text_splitter")
except ImportError as e:
    print(f"Import 1 failed: {e}")

try:
    from langchain_text_splitters import RecursiveCharacterTextSplitter
    print("Import 2 success: langchain_text_splitters")
except ImportError as e:
    print(f"Import 2 failed: {e}")
