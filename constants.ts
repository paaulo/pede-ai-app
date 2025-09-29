
import { Produto, LancamentoTipo } from './types';

export const PRODUTOS: Produto[] = [
    {codigo: '900032', titulo: 'Água Schin 500 C/Gas', descricao: 'Agua Schin Min C/Gas 0,50Lpet Des12Unpbr', imagem_url: 'https://hnk-banco-de-imagens-2022-production.s3.amazonaws.com/Agua_Schin_500m_L_Com_Gas_d1bd9b560c.png'},
    {codigo: '900023', titulo: 'Água Schin 500 S/Gas', descricao: 'Agua Schin Min S/Gas 0,50Lpet Des12Unpbr', imagem_url: 'https://hnk-banco-de-imagens-2022-production.s3.amazonaws.com/Agua_Schin_500m_L_Sem_Gas_193f67a67c.png'},
    {codigo: '900362', titulo: 'Skinka 450 Frutas Citricas', descricao: 'Bbmi Skinka Frutcitr 0,45Lpet Des12Unpbr', imagem_url: 'https://hnk-banco-de-imagens-2022-production.s3.amazonaws.com/Skinka_Frutas_Citricas_450ml_c5e8a141d6.png'},
    {codigo: '900368', titulo: 'Skinka 450 Frutas Vermelhas', descricao: 'Bbmi Skinka Frutverm 0,45Lpet 12Un Pbr', imagem_url: 'https://hnk-banco-de-imagens-2022-production.s3.amazonaws.com/Skinka_Frutas_Vermelhas_450ml_abef52d040.png'},
    {codigo: '904441', titulo: 'Baden Baden 350 Cristal', descricao: 'Beer Baden Pilcrist 0,350Lt Slek2X6Unpbr', imagem_url: 'https://hnk-banco-de-imagens-2022-production.s3.amazonaws.com/7898230716678_Cerveja_Baden_Baden_Pilsen_Cristal_Lata_350ml_2da0f3894d.png'},
    {codigo: '904113', titulo: 'Amstel 269 ', descricao: 'Cerv Amstel Lager 0,269Lt Shr 12Unpbr', imagem_url: 'https://hnk-banco-de-imagens-2022-production.s3.amazonaws.com/7896045505319_Cerveja_Amstel_Lata_269ml_caf955b738.png'},
    {codigo: '904952', titulo: 'Amstel 350 ', descricao: 'Cerv Amstel Lager 0,350Lt Cart12Un Pbr', imagem_url: 'https://hnk-banco-de-imagens-2022-production.s3.amazonaws.com/7896045504831_Cerveja_Amstel_Lata_350ml_efed898ffe.png'},
    {codigo: '904502', titulo: 'Amstel 600 ', descricao: 'Cerv Amstel Lager 0,60L Gfa Rt 24Un', imagem_url: 'https://hnk-banco-de-imagens-2022-production.s3.amazonaws.com/480712502d8455f7354cd5c9b1bd3e1a_d70fd93454_e11f961b0b.png'},
    {codigo: '900118', titulo: 'Baden Baden 600 Golden', descricao: 'Cerv Baden Golden Ale 0,60Lgfa 12Un Pbr ', imagem_url: 'https://hnk-banco-de-imagens-2022-production.s3.amazonaws.com/7898230710201_Cerveja_Baden_Baden_Golden_Ale_Garrafa_600ml_2ae182d086.png'},
    {codigo: '900109', titulo: 'Baden Baden 600 Cristal', descricao: 'Cerv Baden Pilscrist 0,60Lgfa 12Un Pbr  ', imagem_url: 'https://hnk-banco-de-imagens-2022-production.s3.amazonaws.com/7898230710102_Cerveja_Baden_Baden_Pilsen_Cristal_Garrafa_600ml_30f5b360b1.png'},
    {codigo: '904612', titulo: 'Blue Moon 350 ', descricao: 'Cerv Blue Moon 0,350Lt Sleek Cart12Unpbr', imagem_url: 'https://hnk-banco-de-imagens-2022-production.s3.amazonaws.com/large_7896045506507_2_10b0e11e17.jpg'},
    {codigo: '904602', titulo: 'Blue Moon 355 Long Neck', descricao: 'Cerv Blue Moon 0,355Ln Desc 4X6Un Imp', imagem_url: 'https://hnk-banco-de-imagens-2022-production.s3.amazonaws.com/57898235981038_1_2590e41b0e.jpg'},
    {codigo: '903126', titulo: 'Devassa 269 ', descricao: 'Cerv Devassa Lager 0,269Lt Des 12Un Pbr', imagem_url: 'https://hnk-banco-de-imagens-2022-production.s3.amazonaws.com/7898904771712_Cerveja_Devassa_Puro_Malte_Lata_269ml_fc9d6d4b02.png'},
    {codigo: '903131', titulo: 'Devassa 350 ', descricao: 'Cerv Devassa Lager 0,350Ltsleekdes12Upbr', imagem_url: 'https://hnk-banco-de-imagens-2022-production.s3.amazonaws.com/7898904771606_Cerveja_Devassa_Puro_Malte_Lata_350ml_d6555dfec4.png'},
    {codigo: '903061', titulo: 'Devassa 600 ', descricao: 'Cerv Devassa Lager 0,60Lgfa Rt 24Un', imagem_url: 'https://hnk-banco-de-imagens-2022-production.s3.amazonaws.com/7898904771750_Cerveja_Devassa_Puro_Malte_Garrafa_600ml_108eeb5be5.png'},
    {codigo: '900089', titulo: 'Glacial 350 ', descricao: 'Cerv Glacial Pil 0,350Lt Des 12Un Pbr', imagem_url: 'https://hnk-banco-de-imagens-2022-production.s3.amazonaws.com/Glacial_Lata_350ml_Molhada_7434359887.png'},
    {codigo: '900090', titulo: 'Glacial 600 ', descricao: 'Cerv Glacial Pil 0,60Lgfa Rt 24Un', imagem_url: 'https://hnk-banco-de-imagens-2022-production.s3.amazonaws.com/Glacial_Garrafa_600ml_Molhada_Com_Tampa_efb1afe989.png'},
    {codigo: '903996', titulo: 'Heineken 330 Zero', descricao: 'Cerv Heineken 0,0% 0,330Gfa Des 4X6Unpbr', imagem_url: 'https://hnk-banco-de-imagens-2022-production.s3.amazonaws.com/7896045506040_Cerveja_Heineken_Zero_Garrafa_330ml_cc85d0b989.png'},
    {codigo: '904961', titulo: 'Heineken 350 Zero', descricao: 'Cerv Heineken 0,0% 0,350Lt Desc 12Un Pbr', imagem_url: 'https://hnk-banco-de-imagens-2022-production.s3.amazonaws.com/7896045506910_2_e6d84bbfa0.png'},
    {codigo: '905291', titulo: 'Heineken 250 ', descricao: 'Cerv Heineken Pil 0,250Gfa Desc 2X12Un P', imagem_url: 'https://hnk-banco-de-imagens-2022-production.s3.amazonaws.com/78935495_Cerveja_Heineken_Garrafa_250ml_10a988d5a3.png'},
    {codigo: '904721', titulo: 'Heineken 269 ', descricao: 'Cerv Heineken Pil 0,269Lt Desc 8Un Pb', imagem_url: 'https://hnk-banco-de-imagens-2022-production.s3.amazonaws.com/7896045506590_Cerveja_Heineken_Lata_269ml_e540713565.png'},
    {codigo: '903478', titulo: 'Heineken 330 Long Neck', descricao: 'Cerv Heineken Pil 0,330Gfa Desc 4X6Unpbr', imagem_url: 'https://hnk-banco-de-imagens-2022-production.s3.amazonaws.com/78936683_1_df919ad184.jpg'},
    {codigo: '904932', titulo: 'Heineken 350 ', descricao: 'Cerv Heineken Pil 0,350Lt Desc 12Un Pbr', imagem_url: 'https://hnk-banco-de-imagens-2022-production.s3.amazonaws.com/7896045506873_2_c5c4467148.png'},
    {codigo: '903480', titulo: 'Heineken 600 Descartável', descricao: 'Cerv Heineken Pil 0,6Gfa Desc 12Unpbr', imagem_url: 'https://hnk-banco-de-imagens-2022-production.s3.amazonaws.com/Heineken_600ml_bottle_59fe54ee6b.png'},
    {codigo: '903482', titulo: 'Heineken 600 ', descricao: 'Cerv Heineken Pil 0,6Gfa Rt 24Un ', imagem_url: 'https://hnk-banco-de-imagens-2022-production.s3.amazonaws.com/78905498_Cerveja_Heineken_Garrafa_600ml_a4ed2af261.png'},
    {codigo: '904782', titulo: 'Lagunitas 350 Ipa', descricao: 'Cerv Lagunitas Ipa 0,350Lt Sleek 12Un Pb', imagem_url: 'https://hnk-banco-de-imagens-2022-production.s3.amazonaws.com/Lagunitas_Lata_IPA_350ml_7f3c502d9a.png'},
    {codigo: '903483', titulo: 'Heineken 5000 Barril 5L', descricao: 'Draft Beer Heineken Pil 5L Desc 2Unpbr', imagem_url: 'https://hnk-banco-de-imagens-2022-production.s3.amazonaws.com/8712000025649_Cerveja_Heineken_Keg_5_L_f4b6993df5.png'},
    {codigo: '903791', titulo: 'Fys 350 Guaraná', descricao: 'Refr Fys Guarana 0,350Lt Des 12Un Pbr', imagem_url: 'https://hnk-banco-de-imagens-2022-production.s3.amazonaws.com/7896052607044_Refrigerante_Guarana_da_Amazonia_F_Ys_Lata_350ml_9f21e6ba65.png'},
    {codigo: '903793', titulo: 'Fys 350 Laranja', descricao: 'Refr Fys Laranja 0,350Lt Des 12Un Pbr', imagem_url: 'https://hnk-banco-de-imagens-2022-production.s3.amazonaws.com/7896052607129_Refrigerante_Laranja_Pera_F_Ys_Lata_350ml_56654e9f14.png'},
    {codigo: '903795', titulo: 'Fys 350 Limão', descricao: 'Refr Fys Limao 0,350Lt Des 12Un Pbr', imagem_url: 'https://hnk-banco-de-imagens-2022-production.s3.amazonaws.com/7896052607167_Refrigerante_Limao_Siciliano_F_Ys_Lata_350ml_ee8c0b4776.png'},
    {codigo: '905282', titulo: 'Fys 350 Limão Zero', descricao: 'Refr Fys Limao Zero 0,350Lt Desc 12Unpbr', imagem_url: 'https://hnk-banco-de-imagens-2022-production.s3.amazonaws.com/000000000_1_d62a55adc1.png'},
    {codigo: '905283', titulo: 'Fys 350 Guaraná Zero', descricao: 'Refr Fys Guarana Zero 0,350Lt Desc12Unpb', imagem_url: 'https://hnk-banco-de-imagens-2022-production.s3.amazonaws.com/7896052608157_1_e3b9a2e8df.png'}
];

export const LANCAMENTO_TIPOS: LancamentoTipo[] = ['Venda', 'Bonificação', 'Troca', 'Reposição'];
