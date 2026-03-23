
from bs4 import BeautifulSoup
import requests
from urllib.parse import urljoin
from FINEP import coletar_editais_finep

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/114.0 Safari/537.36"
    )
}

def requests_get(url, headers=None, timeout=10):
    try:
        response = requests.get(url, headers=headers, timeout=timeout)
        response.raise_for_status()
        response.encoding = response.apparent_encoding or response.encoding
        return response.text
    except requests.exceptions.RequestException as e:
        print(f"Erro ao acessar {url}: {e}")
        return None

def buscar_editais():
    resultados = []
    for fornecedor in FORNECEDORES_EDITAIS:
        resultados.extend(fornecedor())
    return resultados



def editais_cnpq():
    BASE_URL = (
    "http://memoria2.cnpq.br/web/guest/"
    "chamadas-publicas"
    "?p_p_id=resultadosportlet_WAR_resultadoscnpqportlet"
    "_INSTANCE_0ZaM&filtro=abertas"
)
    html_content = requests_get(BASE_URL, headers=HEADERS)
    if not html_content:
        return []

    soup = BeautifulSoup(html_content, "html.parser")
    cards = soup.find_all("div", class_="content")
    links_permanentes = soup.find_all("div", class_="link-permanente")

    resultados = []
    num_items = min(len(cards), len(links_permanentes))

    for i in range(num_items):
        card = cards[i]
        link_div = links_permanentes[i]

        title_tag = card.find("h4")
        description_tag = card.find("p")

        url = None
        input_tag = link_div.find("input", type="text")
        if input_tag and input_tag.has_attr("value"):
            url = input_tag.get("value")

        date_span_text = "Data não encontrada"
        inscricao_div = card.find("div", class_="inscricao")
        if inscricao_div:
            date_li = inscricao_div.find("li")
            if date_li:
                date_span_text = date_li.text.strip()
        
        start_date = "Data de início não encontrada"
        end_date = "Data de fim não encontrada"
        
        if " a " in date_span_text:
            start_date, end_date = date_span_text.split(" a ")            
            start_date = start_date.strip()
            end_date = end_date.strip()

        resultados.append({
            "titulo": title_tag.text.strip() if title_tag else "Título não encontrado",
            "descricao": description_tag.text.strip() if description_tag else "Descrição não encontrada",
            "data_inicio": start_date,
            "data_fim": end_date,           
            "url": url.strip() if url else "URL não encontrada",
            "orgao": "CNPq"
        })
    return resultados


def editais_funcap():
    BASE_URL = "https://montenegro.funcap.ce.gov.br/sugba/editais-site-wordpress"
    BASE_PREFIX = "https://montenegro.funcap.ce.gov.br/sugba/"

    html_content = requests_get(BASE_URL, headers=HEADERS)
    if not html_content:
        return []

    soup = BeautifulSoup(html_content, "html.parser")

    abertos_header = next(
        (
            h2
            for h2 in soup.find_all("h2")
            if "abert" in h2.get_text(" ", strip=True).lower()
        ),
        None,
    )
    if abertos_header is None:
        return []

    resultados = []
    vistos = set()
    for link in abertos_header.find_all_next("a", href=True):
        prox_h2 = link.find_previous("h2")
        if prox_h2 is None or prox_h2 is not abertos_header:
            break

        href = link.get("href", "").strip()
        titulo = link.get_text(" ", strip=True)
        if not href or href == "#" or not titulo:
            continue

        href_baixo = href.lower()
        titulo_baixo = titulo.lower()
        if "index.php?cnpj=" in href_baixo:
            continue
        if not href_baixo.endswith(".pdf"):
            continue
        if "resultado" in href_baixo or "resultado" in titulo_baixo:
            continue
        if "anexo" in titulo_baixo:
            continue

        href_normalizado = href.lstrip("./")
        if href.startswith("../"):
            href_normalizado = href.replace("../", "", 1)
        url_absoluta = urljoin(BASE_PREFIX, href_normalizado)
        if url_absoluta in vistos:
            continue
        vistos.add(url_absoluta)

        resultados.append({
            "titulo": titulo,
            "descricao": "Edital FUNCAP - detalhes no documento oficial.",
            "data_inicio": "Não especificado",
            "data_fim": "Não especificado",
            "url": url_absoluta,
            "orgao": "FUNCAP",
        })

    return resultados


def editais_rnp():
    BASE_URL = "https://www.rnp.br/pesquisa-e-desenvolvimento/chamadas-publicas/"

    html_content = requests_get(BASE_URL, headers=HEADERS)
    if not html_content:
        return []

    soup = BeautifulSoup(html_content, "html.parser")
    aberto_header = next(
        (
            tag
            for tag in soup.find_all(["h2", "h3"])
            if "editais abertos" in tag.get_text(" ", strip=True).lower()
        ),
        None,
    )
    if aberto_header is None:
        return []

    sem_resultado = aberto_header.find_next(
        lambda tag: tag.name in {"h2", "p"}
        and "nenhum resultado encontrado" in tag.get_text(" ", strip=True).lower()
    )
    if sem_resultado is not None:
        return []

    resultados = []
    vistos = set()
    for tag in aberto_header.find_all_next():
        if tag.name in {"h2", "h3"} and tag is not aberto_header:
            break
        if tag.name != "a" or not tag.get("href"):
            continue

        href = tag.get("href", "").strip()
        titulo = tag.get_text(" ", strip=True)
        if not href or href == "#" or not titulo:
            continue

        url_absoluta = urljoin(BASE_URL, href)
        if url_absoluta in vistos:
            continue
        vistos.add(url_absoluta)

        resultados.append({
            "titulo": titulo,
            "descricao": "Chamada publica RNP - detalhes na pagina oficial.",
            "data_inicio": "Não especificado",
            "data_fim": "Não especificado",
            "url": url_absoluta,
            "orgao": "RNP",
        })

    return resultados


FORNECEDORES_EDITAIS = [
    coletar_editais_finep,
    editais_cnpq,
    editais_funcap,
    editais_rnp,
]
