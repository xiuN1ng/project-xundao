// ==================== 法宝系统 ====================
let currentArtifactSlot = 'weapon';

function showArtifactPanel(slot) {
  currentArtifactSlot = slot;
  const modal = document.getElementById('artifactModal');
  modal.classList.add('active');
  renderArtifactUI();
}

function closeArtifactModal() {
  document.getElementById('artifactModal').classList.remove('active');
}

function renderArtifactUI() {
  renderMaterialInventory();
  renderOwnedArtifacts();
  renderForgeRecipes();
  renderHeavenTreasures();
  updateArtifactSlots();
}

function renderArtifactUI() {
  renderMaterialInventory();
  renderOwnedArtifacts();
  renderForgeRecipes();
  renderHeavenTreasures();
  updateArtifactSlots();
  renderEnhanceUI();
}

