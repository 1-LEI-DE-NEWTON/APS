
from bs4 import BeautifulSoup
import requests
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
    BASE_URL = "https://montenegro.funcap.ce.gov.br/sugba/editais/"

    html_content = requests_get(BASE_URL, headers=HEADERS)
    if not html_content:
        return []

    soup = BeautifulSoup(html_content, "html.parser")
    
    abertos_header = None
    for h5 in soup.find_all("h5"):
        if "Editais Abertos" in h5.get_text():
            abertos_header = h5
            break

    if not abertos_header:
        return []
    
    abertos_container = abertos_header.find_parent("div")
    if not abertos_container:
        return []

    panels = abertos_container.find_all(
        "div", class_="ui-tabs-panel ui-widget-content ui-corner-bottom"
    )

    resultados = []
    for panel in panels:
        titulo_tag = panel.find("b")
        titulo = titulo_tag.get_text(strip=True) if titulo_tag else "Título não encontrado"

        descricao_tag = panel.find("p")
        descricao = descricao_tag.get_text(strip=True) if descricao_tag else "Descrição não disponível"
        
        link_tag = panel.find("a", href=True)
        url = link_tag["href"] if link_tag else ""
        
        data_pub = "Data não encontrada"
        tabela = panel.find("table")
        if tabela:
            linhas = tabela.find_all("tr")
            for linha in linhas:
                colunas = linha.find_all("td")
                if len(colunas) >= 2:
                    data_pub = colunas[-1].get_text(strip=True)
                    break  
        
        data_inicio = data_pub
        data_fim = "Não especificado"

        inscricao_div = panel.find("div", class_="inscricao")
        if inscricao_div:
            date_li = inscricao_div.find("li")
            if date_li:
                date_text = date_li.get_text(strip=True)
                if " a " in date_text:
                    partes = date_text.split(" a ")
                    data_inicio = partes[0].strip()
                    data_fim = partes[1].strip()
                else:
                    data_inicio = date_text

        resultados.append({
            "titulo": titulo,
            "descricao": descricao,
            "data_inicio": data_inicio,
            "data_fim": data_fim,
            "url": url,
            "orgao": "FUNCAP",
        })

    return resultados


FORNECEDORES_EDITAIS = [
    coletar_editais_finep,
    editais_cnpq,
    editais_funcap,
]
