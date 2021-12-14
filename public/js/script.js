'use-strict';

const addTable = document.getElementById('add-table');
const removeTable = document.getElementById('remove-table');
const table = document.querySelector('.table');
const reportForm = document.querySelector('.report-form');
const sort = document.querySelector('#sort');
const search = document.querySelector('.search-bar');
const searchInput = document.querySelector('.search-input');

if (search) {
  search.addEventListener('submit', e => {
    e.preventDefault();

    const input = searchInput.value.toLowerCase();
    if (input) {
      const path = window.location.href.split('?')[0];
      location.assign(`${path}?search=${input}`);
    }
  });
}

if (sort) {
  sort.addEventListener('change', e => {
    const value = e.target.value.toLowerCase();
    const path = window.location.href.split('?')[0];
    if (value === 'newest' || value === 'oldest') {
      location.assign(`${path}?sort=${value}`);
    }
  });
}

if (addTable) {
  const markup = `
    <tr>
      <td>
        <select class="form-select" name="category" id="category">
          <option value="" selected>Categories</option>
          <option value="True Or False">True or False</option>
          <option value="Identification">Identification</option>
          <option value="Multiple Choice">Multiple Choice</option>
          <option value="Fill in Blanks">Fill in Blanks</option>
          <option value="Enumeration">Enumeration</option>
          <option value="Matching Type">Matching Type</option>
        </select>
      </td>
      <td><input type="number" class="form-control correct" name="correct"></td>
      <td><input type="number" class="form-control wrong" name="wrong"></td>
    </tr>`;

  addTable.addEventListener('click', e => {
    e.preventDefault();
    table.childNodes[1].insertAdjacentHTML('beforeend', markup);
  });
}

if (removeTable) {
  removeTable.addEventListener('click', e => {
    e.preventDefault();
    table.childNodes[1].removeChild(table.childNodes[1].lastChild);
  });
}
