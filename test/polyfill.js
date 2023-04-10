export default `
    <script id="__percy_shadowdom_helper" data-percy-injected="true">
    function reversePolyFill(root=document){
    root.querySelectorAll('template[shadowroot]').forEach(template => {
        const mode = template.getAttribute('shadowroot');
        const shadowRoot = template.parentNode.attachShadow({ mode });
        shadowRoot.appendChild(template.content);
        template.remove();
    });

    root.querySelectorAll('[data-percy-shadow-host]').forEach(shadowHost => reversePolyFill(shadowHost.shadowRoot));
    }

    if (["interactive", "complete"].includes(document.readyState)) {
    reversePolyFill();
    } else {
    document.addEventListener("DOMContentLoaded", () => reversePolyFill());
    }
    </script>
`.replace(/(\n|\s{2}|\t)/g, '');
