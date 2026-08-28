import os
import glob
from langchain_community.document_loaders import TextLoader
try:
    from langchain.text_splitter import RecursiveCharacterTextSplitter
except ImportError:
    from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import Chroma
from dotenv import load_dotenv

# Load env variables
load_dotenv()

print(f"DEBUG: Starting build_index.py")
print(f"DEBUG: CWD: {os.getcwd()}")

# Simple relative paths
KB_PATH = "knowledge_base"
DB_PATH = "chroma_db"

# Check if we need to look one level up
if not os.path.exists(KB_PATH) and os.path.exists("../knowledge_base"):
    KB_PATH = "../knowledge_base"

print(f"DEBUG: KB_PATH: {KB_PATH}")
print(f"DEBUG: DB_PATH: {DB_PATH}")

def build_index():
    print("🚀 Starting Knowledge Base Indexing...")
    
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        print("❌ Error: GOOGLE_API_KEY not found in .env (or environment). Cannot build index.")
        # Debug env
        # print("Env vars:", os.environ)
        return

    # 1. Load Documents
    search_pattern = os.path.join(KB_PATH, "*.md")
    print(f"DEBUG: Searching for docs in {search_pattern}")
    md_files = glob.glob(search_pattern)
    if not md_files:
        print(f"❌ No markdown files found in {KB_PATH}")
        print(f"Content of {KB_PATH}:")
        try:
             print(os.listdir(KB_PATH))
        except:
             print("Cannot list dir")
        return
    
    documents = []
    for file_path in md_files:
        try:
            loader = TextLoader(file_path, encoding='utf-8')
            documents.extend(loader.load())
            print(f"   - Loaded: {os.path.basename(file_path)}")
        except Exception as e:
            print(f"   - Failed to load {file_path}: {e}")

    # 2. Split Text
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    texts = text_splitter.split_documents(documents)
    print(f"ℹ️  Split {len(documents)} docs into {len(texts)} chunks.")

    # 3. Create Vector Store
    print("⏳ Generating Embeddings (this may take a moment)...")
    try:
        embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001", google_api_key=api_key)
        vector_db = Chroma.from_documents(
            documents=texts, 
            embedding=embeddings,
            persist_directory=DB_PATH
        )
        vector_db.persist()
        print(f"✅ Success! Index saved to {DB_PATH}")
    except Exception as e:
        print(f"❌ Error creating/persisting index: {e}")

if __name__ == "__main__":
    build_index()
