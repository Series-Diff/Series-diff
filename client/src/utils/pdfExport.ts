import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { TimeSeriesEntry } from '@/services/fetchTimeSeries';

async function placeElementsInPdf(pdf: jsPDF, elements: HTMLElement[], yOffset: number, PDFpageWidth: number, PDFpageHeight: number, ySpacing: number, isChildren = true, preferredItemsPerRow = 3) {
    let rowY = yOffset; // Aktualna y dla bieżącego rzędu 
    let currentRow: { canvas: HTMLCanvasElement; width: number; height: number }[] = [];
    const availableWidth = PDFpageWidth - 80; // Margins 40 each side
    const gap = 10; // Small gap between items
    const scale = 4;

    let itemsPerRow = preferredItemsPerRow;

    for (let j = 0; j < elements.length; j++) {
        const element = elements[j];
        // Dynamiczne wymuszenie wyrównania tekstu do lewej: Klonuj element do offscreen container, ustaw style na wszystkich <p> (bez zmiany oryginału, unikaj błędów iframe)
        const clone = element.cloneNode(true) as HTMLElement;
        clone.querySelectorAll('p').forEach(p => {
            (p as HTMLElement).style.setProperty('text-align', 'left', 'important');
        });
        const tempContainer = document.createElement('div'); // Offscreen container do capture (unikaj cloned iframe błędów)
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        tempContainer.appendChild(clone);
        document.body.appendChild(tempContainer);
        // Capture offscreen klona (dzieci lub całe) z wyższą scale=scale dla wyraźności
        const canvas = await html2canvas(tempContainer, {
            scale: scale, // Wyższa skala dla lepszej jakości/wyraźności tekstu (mniej rozciągnięty/rozmyty)
            backgroundColor: '#ffffff',
            useCORS: true,
            logging: false,
            allowTaint: true,
            windowWidth: element.offsetWidth,
            windowHeight: element.offsetHeight,
            scrollX: 0,
            scrollY: 0,
            removeContainer: true // Automatycznie usuń temp po capture
        });
        document.body.removeChild(tempContainer); // Usuń jeśli removeContainer nie działa
        currentRow.push({ canvas, width: canvas.width, height: canvas.height });
        const isLast = j === elements.length - 1;
        if (currentRow.length === itemsPerRow || isLast) {
            // Calculate row dimensions: max height, total width (scaled) - zachowuje oryginalne proporcje, nie ściska/wydłuża
            const rowMaxHeight = Math.max(...currentRow.map(item => item.height));
            // Wymuszone skalowanie na podstawie preferred itemsPerRow (jakby 5 elementów - mniejsza skala nawet jeśli mniej)
            const forcedTotalWidth = preferredItemsPerRow * ((currentRow[0]?.width / scale) || 100) + gap * (preferredItemsPerRow - 1); // Szerokość jakby max elementów, /4 bo scale=4
            const itemScaleFactor = Math.min(1, availableWidth / forcedTotalWidth); // Skaluj w dół jeśli za szeroko
            const rowHeight = (rowMaxHeight / scale) * itemScaleFactor; // /4 bo scale=4, adjust if needed
            // Check if row fits on page
            if (rowY + rowHeight + 20 > PDFpageHeight) {
                pdf.addPage();
                rowY = 40;
            }
            // Add row items side by side, wyrównane do lewej (bez centracji tekstu - to w CSS strony), równo rozłożone z odstępami
            let xOffset = 40; // Wyrównane do lewej (margines)
            for (const item of currentRow) {
                const imgData = item.canvas.toDataURL('image/png');
                const scaledWidth = (item.width / scale) * itemScaleFactor; // Zachowuje oryginalne proporcje (bez ściskania/wydłużania jeśli mieści się), /4 bo scale=4
                const scaledHeight = (item.height / scale) * itemScaleFactor;
                pdf.addImage(imgData, 'PNG', xOffset, rowY, scaledWidth, scaledHeight);
                xOffset += scaledWidth + gap; // Gap po elemencie
            }
            rowY += rowHeight + 20; // Space below row
            currentRow = [];
        }
    }
    return rowY; // Zwróć zaktualizowane yOffset po grupie
}

export async function exportToPDF(chartData: Record<string, TimeSeriesEntry[]>, reportTitle: string, setIsExporting: React.Dispatch<React.SetStateAction<boolean>>) {
    setIsExporting(true);

    try {
        const contentElements = document.querySelectorAll('[id^="pdf-content-"]');
        if (contentElements.length === 0) {
            console.error('No PDF content elements found');
            return;
        }

        // Dynamic file name based on data
        const uniqueFiles = Array.from(new Set(Object.keys(chartData).map(name => name.split('.').slice(1).join('.')).filter(part => part && part.length > 0)));
        const filePart = uniqueFiles.join('_').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
        const filename = `report_${filePart || 'export'}.pdf`;

        const pdf = new jsPDF('p', 'pt', 'a4');
        const PDFpageWidth = pdf.internal.pageSize.getWidth();
        const PDFpageHeight = pdf.internal.pageSize.getHeight();
        let xOffset = 40; // Default side margin in pt
        let yOffset = 60; // Starting position after title
        const ySpacing = 20; // Globalny odstęp między sekcjami

        // Add title at the top
        if (reportTitle && reportTitle.trim() !== '') {
            pdf.setFontSize(20);
            pdf.text(reportTitle, PDFpageWidth / 2, 40, { align: 'center' });
        }

        const sectionTitles: Record<string, string> = {
            'pdf-content-statistics-horizontal': 'Statistics',
            'pdf-content-metrics-vertical': 'Metrics'
        };

        // Grupowanie elementów po ID (np. wszystkie 'pdf-content-metrics-vertical' w jednej grupie)
        const groups: Record<string, HTMLElement[]> = {};
        contentElements.forEach((element) => {
            const elementId = (element as HTMLElement).id.toLowerCase();
            if (!groups[elementId]) {
                groups[elementId] = [];
            }
            groups[elementId].push(element as HTMLElement);
        });

        // Iteracja po unikalnych ID (sekcjach): Dodaj tytuł raz dla grupy, potem przetwórz elementy w grupie
        for (const groupId in groups) {
            const elementsInGroup = groups[groupId];
            const sectionTitle = sectionTitles[groupId] || 'Section';

            // Chyba bardziej chodzi o utworzenie nowej strony jeśli nie mieści się
            if (yOffset + 30 > PDFpageHeight) {
                pdf.addPage();
                yOffset = 40;
            }

            // Add section subtitle (centered) - tylko raz dla grupy
            if (groupId !== 'pdf-content-chart') {
                if (groupId === 'pdf-content-metrics-vertical') {
                    pdf.addPage();
                    yOffset = 40;
                }
                pdf.setFontSize(16);
                pdf.text(sectionTitle, xOffset, yOffset);
                yOffset += ySpacing;
            }

            // Przetwarzanie elementów w grupie w zależności od ID
            if (groupId.includes('pdf-content-statistics-horizontal')) {
                // Dla każdej grupy (elementu): Dodaj podtytuł z <h3>{groupName} Metrics</h3> (większe wcięcie, np. xOffset + 20)
                for (let j = 0; j < elementsInGroup.length; j++) {
                    const element = elementsInGroup[j];
                    const headerElement = element.querySelector('.statistic-group-header h3'); // Pobierz treść podtytułu
                    const subTitle = headerElement ? headerElement.textContent || '' : 'Subsection'; // Treść z <h3>

                    if (yOffset + 20 > PDFpageHeight) {
                        pdf.addPage();
                        yOffset = 40;
                    }
                    pdf.setFontSize(14); // Mniejszy font dla podtytułu
                    pdf.text(subTitle, xOffset + 20, yOffset); // Większe wcięcie
                    yOffset += ySpacing;

                    // Potem rozmieść .single-statistics-group z równymi odstępami, oryginalnymi proporcjami, wyrównane do lewej
                    const childElements = Array.from(element.querySelectorAll('.single-statistics-group')) as HTMLElement[];
                    yOffset = await placeElementsInPdf(pdf, childElements, yOffset, PDFpageWidth, PDFpageHeight, ySpacing, true, 3); // Użyj wspólnej funkcji, preferredItemsPerRow=5 (max 5 dla horizontal), isChildren=true
                }
            } else if (groupId.includes('pdf-content-metrics-vertical')) {
                for (let j = 0; j < elementsInGroup.length; j++) {
                    // Standard capture for vertical metrics as a whole, scaled to fit 2 columns if needed
                    let scale = 2; // Higher for detailed text/tables - Co robi skala?
                    xOffset = 40;
                    // Capture with adjusted scale - pobiera ze strony element z odpowiednią skalą?
                    const canvas = await html2canvas(elementsInGroup[j], {
                        scale: scale, // Czy ta skala to to samo co wcześniejsze skale?
                        backgroundColor: '#ffffff',
                        useCORS: true, // ???
                        logging: false, // ???
                        allowTaint: true, // ???
                        windowWidth: document.body.scrollWidth || 1200, // 1854
                        windowHeight: document.body.scrollHeight || 800, // 2223
                        scrollX: 0,
                        scrollY: -window.scrollY, // Reset scrolla // -300
                        width: elementsInGroup[j].scrollWidth, // Pełna szerokość elementu // 1548
                        height: elementsInGroup[j].scrollHeight // Pełna wysokość // 600
                    });
                    const imgData = canvas.toDataURL('image/png'); // konwersja kanwy na obraz???
                    const ratio = canvas.height / canvas.width;
                    let imgWidth = (PDFpageWidth - (xOffset * 2)); // ZMIANA: Domyślnie szerokość dla 2 kolumn (jeśli się mieszczą)
                    let imgHeight = imgWidth * ratio; // Dlaczego ratio na podstawie wyniku kanwy? Zachowuje proporcje oryginalnego elementu
                    // Ponownie sprawdza miejsce tak jak przy sekcjach - chyba ok bo może być dużo elementów
                    // Check for new page
                    if (yOffset + imgHeight + 40 > PDFpageHeight) {
                        pdf.addPage();
                        yOffset = 40;
                    }
                    // Add image, centered - może być na środku ale kilka równo rozłożonych. Dla 2 kolumn: Dodaj po lewej, a jeśli druga kolumna, po prawej (tutaj zakładam pojedynczy - jeśli wiele, powtórz capture i dodaj obok)
                    pdf.addImage(imgData, 'PNG', xOffset, yOffset, imgWidth, imgHeight); // Lewa kolumna
                    // Jeśli druga kolumna: pdf.addImage(secondImgData, 'PNG', xOffset + imgWidth + 10, yOffset, imgWidth, imgHeight);
                    yOffset += imgHeight + ySpacing; // Space between sections
                }
            } else {
                // Standard capture for other elements (e.g., chart, vertical metrics)
                let scale = 2; // Default - Co robi skala?

                const isChart = groupId.includes('chart');
                const isMetrics = groupId.includes('metrics') || groupId.includes('stats');
                if (isChart) {
                    scale = 1.5; // Lower scale for charts to fit better
                    xOffset = 20; // Smaller margins for wider charts
                } else if (isMetrics) {
                    scale = 2; // Higher for detailed text/tables
                    xOffset = 40;
                }

                for (let j = 0; j < elementsInGroup.length; j++) {  // ZMIANA: Dodano pętlę, aby przetwarzać każdy element osobno (zapobiega duplikatom)
                    // Capture with adjusted scale - pobiera ze strony element z odpowiednią skalą?
                    const canvas = await html2canvas(elementsInGroup[j], { // ZMIANA: [0] -> [j]
                        scale: 2.5,
                        backgroundColor: '#ffffff',
                        useCORS: true, // pozwala na ładowanie zasobów z innych domen (np. czcionki/obrazy);
                        logging: false, // wyłącza debug logi w konsoli
                        allowTaint: true, // umożliwia canvas z cross-origin danymi (wymagane dla bezpieczeństwa w przeglądarce).
                        windowWidth: document.body.scrollWidth || 1200, // 1854
                        windowHeight: document.body.scrollHeight || 800, // 2223
                        scrollX: 0,
                        scrollY: -window.scrollY, // Reset scrolla // -300
                        width: elementsInGroup[j].scrollWidth, // Pełna szerokość elementu // 1548  // ZMIANA: [0] -> [j]
                        height: elementsInGroup[j].scrollHeight // Pełna wysokość // 600  // ZMIANA: [0] -> [j]
                    });

                    // konwertuje canvas (wynik html2canvas) na base64-encoded PNG, gotowy do wstawienia w PDF via addImage.
                    const imgData = canvas.toDataURL('image/png');
                    const ratio = canvas.height / canvas.width;
                    let imgWidth = PDFpageWidth - (xOffset * 2); // Raczej zrozumiałe i ok - maksymalna szerokość wykresu  - metryki vertykalne może da sie zmieścić  2 obok siebie?
                    let imgHeight = imgWidth * ratio; // Dlaczego ratio na podstawie wyniku kanwy?

                    // Check for new page
                    if (yOffset + imgHeight + 40 > PDFpageHeight) {
                        pdf.addPage();
                        yOffset = 40;
                    }

                    // Add image, centered - może być na środku ale kilka równo rozłożonych
                    pdf.addImage(imgData, 'PNG', (PDFpageWidth - imgWidth) / 2, yOffset, imgWidth, imgHeight);
                    yOffset += imgHeight + ySpacing; // Space between sections
                }
            }
        }
        pdf.save(filename);
    } catch (err) {
        console.error('Error during PDF export:', err);
    } finally {
        setIsExporting(false);
    }
};