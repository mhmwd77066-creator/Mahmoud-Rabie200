window.onload = function() {
    refreshUI();
};

// 1. وظيفة التعديل المباشر في المخزن
function editInventory(idx, field, newValue) {
    let inv = JSON.parse(localStorage.getItem('popInventory')) || [];
    if (field === 'cost' || field === 'qty') newValue = parseFloat(newValue);
    inv[idx][field] = newValue;
    localStorage.setItem('popInventory', JSON.stringify(inv));
    refreshUI();
}

// 2. وظيفة التعديل المباشر في مبيعات الأيام
function editSale(id, field, newValue) {
    let sales = JSON.parse(localStorage.getItem('popSales')) || [];
    let sale = sales.find(s => s.id === id);
    if (sale) {
        if (field === 'sell' || field === 'cost' || field === 'qty') {
            newValue = parseFloat(newValue);
            sale[field] = newValue;
            // إعادة حساب الربح بناءً على السعر الجديد والكمية
            sale.profit = (sale.sell * sale.qty) - (sale.cost * sale.qty);
        } else {
            sale[field] = newValue;
        }
        localStorage.setItem('popSales', JSON.stringify(sales));
        refreshUI();
    }
}

// 3. التحكم في الأسبوع واليوم
function startNewWeek() {
    const name = prompt("سمّي الأسبوع (مثلاً: أسبوع العيد):");
    if (name) {
        localStorage.setItem('currentWeekName', name);
        localStorage.setItem('popSales', JSON.stringify([]));
        localStorage.removeItem('currentDayName');
        refreshUI();
    }
}

function finishDay() {
    const dayName = prompt("اكتب اسم اليوم اللي عايز تبدأه (السبت، الأحد...):");
    if (dayName) {
        localStorage.setItem('currentDayName', dayName);
        alert(`تم تقفيل اليوم السابق وبدء يوم: ${dayName}`);
        refreshUI();
    }
}

// 4. العمليات (بيع، مخزن، مصاريف)
function addToInventory() {
    const name = document.getElementById('itemName').value,
          cost = parseFloat(document.getElementById('itemCost').value),
          qty = parseInt(document.getElementById('itemQty').value);
    if (name && !isNaN(cost)) {
        let inv = JSON.parse(localStorage.getItem('popInventory')) || [];
        inv.push({ name, cost, qty });
        localStorage.setItem('popInventory', JSON.stringify(inv));
        refreshUI();
        document.getElementById('itemName').value = ''; 
        document.getElementById('itemCost').value = ''; 
        document.getElementById('itemQty').value = '';
    }
}

function makeSale() {
    const day = localStorage.getItem('currentDayName');
    if (!day) return alert("من فضلك دوس على 'تقفيل اليوم وبدء يوم جديد' وحدد اليوم الأول!");

    const name = document.getElementById('saleItemSelect').value,
          price = parseFloat(document.getElementById('salePrice').value),
          qtyToSell = parseInt(document.getElementById('saleQty').value);

    if (name && price && qtyToSell > 0) {
        let inv = JSON.parse(localStorage.getItem('popInventory')) || [];
        let item = inv.find(i => i.name === name);

        if (item && item.qty >= qtyToSell) {
            let sales = JSON.parse(localStorage.getItem('popSales')) || [];
            sales.push({
                id: Date.now(),
                day: day,
                item: name,
                cost: item.cost,
                sell: price,
                qty: qtyToSell,
                profit: (price - item.cost) * qtyToSell,
                type: 'sale'
            });
            item.qty -= qtyToSell;
            localStorage.setItem('popInventory', JSON.stringify(inv));
            localStorage.setItem('popSales', JSON.stringify(sales));
            refreshUI();
            document.getElementById('salePrice').value = '';
            document.getElementById('saleQty').value = '1';
        } else {
            alert("المخزن لا يكفي هذه الكمية!");
        }
    }
}

function addExpense() {
    const day = localStorage.getItem('currentDayName');
    const name = document.getElementById('expName').value,
          price = parseFloat(document.getElementById('expPrice').value);
    if (day && name && price) {
        let sales = JSON.parse(localStorage.getItem('popSales')) || [];
        sales.push({ id: Date.now(), day: day, item: name, cost: 0, sell: 0, qty: 1, profit: -price, type: 'expense' });
        localStorage.setItem('popSales', JSON.stringify(sales));
        refreshUI();
    }
}

// 5. تحديث الواجهة
function refreshUI() {
    const inv = JSON.parse(localStorage.getItem('popInventory')) || [],
          sales = JSON.parse(localStorage.getItem('popSales')) || [];
    const week = localStorage.getItem('currentWeekName') || "لا يوجد أسبوع";
    const day = localStorage.getItem('currentDayName') || "لم يحدد يوم";

    document.getElementById('currentWeekTitle').innerText = `EL POP | ${week} (${day})`;

    // تحديث جدول المخزن
    const invTbody = document.querySelector('#inventoryTable tbody'); invTbody.innerHTML = '';
    const select = document.getElementById('saleItemSelect'); select.innerHTML = '<option value="">اختر المنتج...</option>';
    inv.forEach((i, idx) => {
        if(i.qty > 0) select.innerHTML += `<option value="${i.name}">${i.name} (${i.qty})</option>`;
        invTbody.innerHTML += `<tr>
            <td contenteditable="true" onblur="editInventory(${idx}, 'name', this.innerText)">${i.name}</td>
            <td contenteditable="true" onblur="editInventory(${idx}, 'cost', this.innerText)">${i.cost}</td>
            <td contenteditable="true" onblur="editInventory(${idx}, 'qty', this.innerText)">${i.qty}</td>
            <td><button onclick="deleteInv(${idx})" style="background:red; color:white;">حذف</button></td>
        </tr>`;
    });

    // تحديث سجل الأيام
    const container = document.getElementById('daysLogContainer'); container.innerHTML = '';
    const grouped = {};
    sales.forEach(s => { if(!grouped[s.day]) grouped[s.day] = []; grouped[s.day].push(s); });

    let tS = 0, tP = 0, tE = 0;
    for(let d in grouped) {
        let dayHtml = `<div class="day-card" style="margin-bottom:15px; border:1px solid #ddd; background:#fff; border-radius:8px;">
            <div style="background:#f39c12; color:white; padding:8px;"><strong>📅 ${d}</strong></div>
            <table style="width:100%"><tr><th>الصنف</th><th>العدد</th><th>السعر</th><th>حذف</th></tr>`;
        grouped[d].forEach(item => {
            let totalRow = item.type === 'sale' ? (item.sell * item.qty) : Math.abs(item.profit);
            if(item.type === 'sale') tS += totalRow;
            else tE += totalRow;
            tP += item.profit;

            dayHtml += `<tr>
                <td contenteditable="true" onblur="editSale(${item.id}, 'item', this.innerText)">${item.item}</td>
                <td contenteditable="true" onblur="editSale(${item.id}, 'qty', this.innerText)">${item.qty}</td>
                <td contenteditable="true" onblur="editSale(${item.id}, 'sell', this.innerText)">${totalRow}</td>
                <td><button onclick="deleteEntry(${item.id})">🗑️</button></td>
            </tr>`;
        });
        dayHtml += `</table></div>`;
        container.innerHTML += dayHtml;
    }
    document.getElementById('totalSales').innerText = tS;
    document.getElementById('totalExp').innerText = tE;
    document.getElementById('netProfit').innerText = tP;
    displayArchive();
}

// 6. الحذف والأرشفة
function deleteEntry(id) {
    let sales = JSON.parse(localStorage.getItem('popSales'));
    sales = sales.filter(s => s.id !== id);
    localStorage.setItem('popSales', JSON.stringify(sales));
    refreshUI();
}

function deleteInv(idx) {
    let inv = JSON.parse(localStorage.getItem('popInventory'));
    inv.splice(idx, 1);
    localStorage.setItem('popInventory', JSON.stringify(inv));
    refreshUI();
}

function archiveWeek() {
    const sales = JSON.parse(localStorage.getItem('popSales')),
          week = localStorage.getItem('currentWeekName');
    if(week && sales.length > 0) {
        if(confirm("هل تريد تقفيل الأسبوع وأرشفته؟")){
            let arc = JSON.parse(localStorage.getItem('popArchive')) || [];
            arc.push({ label: week, data: sales });
            localStorage.setItem('popArchive', JSON.stringify(arc));
            localStorage.removeItem('popSales');
            localStorage.removeItem('currentWeekName');
            localStorage.removeItem('currentDayName');
            refreshUI();
        }
    }
}

function displayArchive() {
    const arc = JSON.parse(localStorage.getItem('popArchive')) || [];
    const container = document.getElementById('archiveContainer'); container.innerHTML = '';
    arc.forEach((w, idx) => {
        container.innerHTML += `<div class="archive-item" style="padding:10px; border-bottom:1px solid #eee; display:flex; justify-content:space-between;">
            <span>📂 ${w.label}</span>
            <div>
                <button onclick="restoreFromArchive(${idx})">تعديل ✏️</button>
                <button onclick="deleteArchive(${idx})" style="background:red; color:white;">حذف 🗑️</button>
            </div>
        </div>`;
    });
}

function restoreFromArchive(idx) {
    const arc = JSON.parse(localStorage.getItem('popArchive')) || [];
    const week = arc[idx];
    localStorage.setItem('currentWeekName', week.label);
    localStorage.setItem('popSales', JSON.stringify(week.data));
    arc.splice(idx, 1);
    localStorage.setItem('popArchive', JSON.stringify(arc));
    refreshUI();
}

function deleteArchive(idx) {
    if(confirm("حذف الأسبوع ده نهائياً؟")){
        let arc = JSON.parse(localStorage.getItem('popArchive'));
        arc.splice(idx, 1);
        localStorage.setItem('popArchive', JSON.stringify(arc));
        refreshUI();
    }
}

function exportToExcel() {
    const sales = JSON.parse(localStorage.getItem('popSales'));
    const ws = XLSX.utils.json_to_sheet(sales);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sales");
    XLSX.writeFile(wb, "ELPOP_Report.xlsx");
}