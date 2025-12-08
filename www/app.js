$(document).ready(function() {
    const $divisionFilter = $('#divisionFilter');
    const $tableBody = $('#tableBody');
    const $recordCount = $('#recordCount');
    const $noResults = $('#noResults');
    const $tableContainer = $('#tableContainer');

    // Function to get URL parameters
    function getUrlParameter(name) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(name);
    }

    // Function to update URL without page reload
    function updateUrl(division) {
        const url = new URL(window.location);
        if (division && division !== '') {
            url.searchParams.set('section', encodeURIComponent(division));
        } else {
            url.searchParams.delete('section');
        }
        window.history.pushState({ division: division }, '', url);
    }

    function filterTable(updateUrlParam = true) {
        const selectedDivision = $divisionFilter.val();
        let visibleCount = 0;
        
        // Get fresh rows list (in case table was sorted)
        $tableBody.find('tr').each(function() {
            const $row = $(this);
            const rowDivision = $row.data('division');
            
            if (!selectedDivision || rowDivision === selectedDivision) {
                $row.show();
                visibleCount++;
            } else {
                $row.hide();
            }
        });

        $recordCount.text(visibleCount);

        if (visibleCount === 0) {
            $tableContainer.hide();
            $noResults.show();
        } else {
            $tableContainer.show();
            $noResults.hide();
        }

        // Update URL when filter changes (unless called from initial load or popstate)
        if (updateUrlParam) {
            updateUrl(selectedDivision);
        }
    }

    // Handle browser back/forward buttons
    $(window).on('popstate', function() {
        const section = getUrlParameter('section');
        $divisionFilter.val(section ? decodeURIComponent(section) : '');
        filterTable(false); // Don't update URL since we're responding to URL change
    });

    // Initialize: Check URL parameter on page load
    const urlSection = getUrlParameter('section');
    if (urlSection) {
        const decodedSection = decodeURIComponent(urlSection);
        // Check if the section exists in the dropdown options
        if ($divisionFilter.find('option[value="' + decodedSection + '"]').length > 0) {
            $divisionFilter.val(decodedSection);
            filterTable(false); // Don't update URL on initial load
        }
    }

    $divisionFilter.on('change', function() {
        filterTable(true);
    });

    // Table sorting functionality
    let currentSort = {
        column: null,
        direction: 'asc'
    };

    function sortTable(column, direction) {
        const $rows = $tableBody.find('tr').toArray();
        const $targetHeader = $('th[data-sort="' + column + '"]');
        const columnIndex = $targetHeader.index();
        
        if (columnIndex === -1) return;
        
        // Remove sort classes from all headers
        $('th.sortable').removeClass('sort-asc sort-desc');
        
        // Add sort class to current header
        $('th[data-sort="' + column + '"]').addClass(direction === 'asc' ? 'sort-asc' : 'sort-desc');
        
        // Sort rows
        $rows.sort(function(a, b) {
            const $aCell = $(a).find('td').eq(columnIndex);
            const $bCell = $(b).find('td').eq(columnIndex);
            let aValue, bValue;
            
            if (column === 'FIDERating') {
                // Sort by numeric rating value using data-sort-value attribute
                aValue = parseInt($aCell.attr('data-sort-value') || '0');
                bValue = parseInt($bCell.attr('data-sort-value') || '0');
                return direction === 'asc' ? aValue - bValue : bValue - aValue;
            } else {
                // String comparison for other columns
                aValue = ($aCell.text() || '').trim().toLowerCase();
                bValue = ($bCell.text() || '').trim().toLowerCase();
            }
            
            // String comparison
            if (aValue < bValue) return direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return direction === 'asc' ? 1 : -1;
            return 0;
        });
        
        // Re-append sorted rows
        $rows.forEach(function(row) {
            $tableBody.append(row);
        });
        
        // Update current sort
        currentSort = { column, direction };
        
        // Re-apply filter if active
        if ($divisionFilter.val()) {
            setTimeout(function() {
                filterTable(false);
            }, 0);
        }
    }

    // Add click handlers to sortable headers
    $('th.sortable').on('click', function() {
        const column = $(this).attr('data-sort');
        if (!column) return;
        
        // Toggle direction if clicking same column
        if (currentSort.column === column) {
            currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            currentSort.direction = 'asc';
        }
        
        sortTable(column, currentSort.direction);
    });
});

