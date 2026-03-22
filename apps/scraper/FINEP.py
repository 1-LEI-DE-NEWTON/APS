from bs4 import BeautifulSoup
import requests


HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/114.0 Safari/537.36"
    )
}

BASE_URL = "http://www.finep.gov.br/chamadas-publicas"
BASE_DOMAIN = "http://www.finep.gov.br"


def _requests_get(url, headers=None, timeout=10):
    try:
        response = requests.get(url, headers=headers, timeout=timeout)
        response.raise_for_status()
        return response.text
    except requests.exceptions.RequestException as e:
        print(f"Erro ao acessar {url}: {e}")
        return None


def _normalizar_link(link):
    if not link:
        return ""
    if link.startswith("http://") or link.startswith("https://"):
        return link
    return f"{BASE_DOMAIN}{link}"


def obter_itens_finep(soup):
    resultados = []
    container = soup.find("div", class_="item-separator-conteudo")
    if not container:
        return resultados

    for item in container.find_all("div", class_="item"):
        titulo_tag = item.find("h3")
        titulo = titulo_tag.get_text(strip=True) if titulo_tag else ""
        link_tag = titulo_tag.find("a") if titulo_tag else None
        link = _normalizar_link(link_tag["href"]) if link_tag and link_tag.has_attr("href") else ""
        try:
            html_edital = _requests_get(link, headers=HEADERS)
            if html_edital:
                edital_soup = BeautifulSoup(html_edital, "html.parser")
                descricao_tag = edital_soup.find("div", class_="text")
                if descricao_tag:
                    primeira_div = descricao_tag.find("div")
                    descricao = primeira_div.get_text(strip=True) if primeira_div else "Descrição não disponível"
                else:
                    descricao = "Descrição não disponível"
            else:
                descricao = "Descrição não disponível"
        except Exception:
            descricao = "Descrição não disponível"

        data_pub = item.find("div", class_="data_pub")
        data_pub = data_pub.find("span").get_text(strip=True) if data_pub else ""

        prazo = item.find("div", class_="prazo")
        prazo = prazo.find("span").get_text(strip=True) if prazo else "Não especificado"

        resultados.append({
            "titulo": titulo,
            "descricao": descricao,            
            "data_inicio": data_pub,
            "data_fim": prazo,       
            "url": link,
            "orgao": "FINEP",
        })
    return resultados


def coletar_editais_finep():
    html_content = _requests_get(BASE_URL, headers=HEADERS)
    if not html_content:
        return []
    soup = BeautifulSoup(html_content, "html.parser")
    return obter_itens_finep(soup)


if __name__ == "__main__":    
    editais = coletar_editais_finep()
    for edital in editais:
        print(edital)
