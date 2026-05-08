from typing import List

def split_text(text: str, chunk_size: int, chunk_overlap: int) -> List[str]:

    if chunk_size <= 0:
        raise ValueError("chunk_size must be greater than 0")
    if chunk_overlap < 0:
        raise ValueError("chunk_overlap must be greater than or equal to 0")
    if chunk_overlap >= chunk_size:
        raise ValueError("chunk_overlap must be less than chunk_size")
    
    chunks: List[str] = []
    start = 0
    n = len(text)

    while start < n:
        end = min(start + chunk_size, n)
        part = text[start:end].strip()
        if part:
            chunks.append(part)
        if end == n:
            break
        start = end - chunk_overlap
    return chunks